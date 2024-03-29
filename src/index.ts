import * as dotenv from 'dotenv'
import Chalk from 'chalk'
import figlet from 'figlet'
import {Command} from 'commander'
import {default as imageToAscii} from 'image-to-ascii'
import {Database} from 'sqlite-async'
import {createTables, stats} from './db'
import {createAlbum, createMediaItem, oauthGoogle, uploadMedia} from './google-photos_api'
import {
  insertSearchPath,
  readOnePendingSearchPath,
  readSearchPaths,
  updateSearchPathCursor,
  updateSearchPathStatus
} from "./db/search_paths";
import {
  downloadFile,
  listFolderResult,
  markTransferredOnDropbox,
  oauthDropbox,
  selectFilesFromResult
} from "./dropbox_api";
import {
  DropboxItemRecord,
  findTransferable,
  insertDropboxItem,
  readOneDropboxItemByDbId,
  updateDropboxItemStatus
} from "./db/dropbox_items";
import {SqliteTokenStore} from "./oauth2-client/TokenStore/SqliteTokenStore";
import {TokenStore} from "./oauth2-client";
import {getLastAlbumId, saveAlbum} from "./db/google_albums";
import * as fs from "fs";
import {lpad} from "./util/string";

async function getLogUpdate() {
  const logUpdate = await import ('log-update')
  return logUpdate.default
}

async function logTransferStatus(status: string,
                                 item: DropboxItemRecord,
                                 localImagePath?: string,
                                 dimensions?: { width: number, height: number }) {

  const logUpdate = await getLogUpdate()

  if (!localImagePath) {
    logUpdate(lineOne())
    return
  }

  return new Promise<void>((resolve) => {
    imageToAscii(localImagePath, {
      size: {height: 40},
      bg: false,
      fg: true,
      colored: status === 'LINKING' || status === 'SUCCESS'
    }, async (err: unknown, image: string) => {
      logUpdate(lineOne() + '\n' + image)
      resolve()
    })
  })

  function lineOne() {
    const dimStr = dimensions ? `  (${dimensions.width} x ${dimensions.height})` : ''
    return `${lpad(status, 10)} ${item.path_lower}${dimStr}`;
  }


}

//
// logImageAsAscii('/Users/ndp/workspace/drop-drop-box/andy-hs-bone.png')
// logImageAsAscii('/Users/ndp/Downloads/T-shirt_.png')
// setTimeout(() => process.exit(0), 4000)

dotenv.config()

console.log(
  Chalk.greenBright(
    figlet.textSync('drop-drop-box', {horizontalLayout: 'full'})
  )
);


async function loginDropbox(db: Database) {
  const tokenStore: TokenStore = await SqliteTokenStore.setup({db, provider: 'Dropbox'})
  await oauthDropbox({
    clientId: process.env.DROPBOX_CLIENT_ID!,
    clientSecret: process.env.DROPBOX_CLIENT_SECRET!,
    tokenStore
  })
}

async function loginGoogle(db: Database) {
  const tokenStore: TokenStore = await SqliteTokenStore.setup({db, provider: 'Google'})
  await oauthGoogle({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    tokenStore
  })
}

export const loginCmd = new Command('login')
  .argument('[google|dropbox|all]', 'provide to authenticate', 'all')
  .description('Log in')
  .action(async (provider: string) => {
    const db = await getDatabase()

    if (provider.match(/(google|all)/i)) {
      await loginGoogle(db);
    }
    if (provider.match(/(dropbox|all)/i)) {
      await loginDropbox(db);
    }
  })

export const logoutCmd = new Command('logout')
  .argument('[google|dropbox|all]', 'provider to authenticate', 'all')
  .description('Reset the persisted auth')
  .action(async (provider: string) => {
    const db = await getDatabase()

    if (provider.match(/(all|google)/i)) {
      const ts = await SqliteTokenStore.setup({db, provider: 'Google'})
      await ts.resetTokens()
      console.log('Google tokens cleared.')
    }

    if (provider.match(/(all|dropbox)/i)) {
      const ts = await SqliteTokenStore.setup({db, provider: 'Dropbox'})
      await ts.resetTokens()
      console.log('Dropbox tokens cleared.')
    }
  })


export const statsCmd = new Command('stats')
  .description('Show current DB stats and queue lengths')
  .action(async () => {
    const db = await getDatabase()
    console.log('*** Stats ***', await stats(db))
  })

const createAlbumCmd = new Command('album')
  .description('Create new album on Google photos and migrate all future images to this album')
  .argument('name', 'name of album')
  .action(async (name: string) => {
    const db = await getDatabase()
    await loginGoogle(db);

    const albumId = await createAlbum(name)

    await saveAlbum(db, albumId, name)
  })


const transferCmd = new Command('transfer')
  .description('Transfer queued Dropbox items to Google Photos')
  .argument('[n]', 'number files to move')
  .action(async (max) => {

    const tempDir = fs.mkdtempSync('/private/tmp/drop-drop-box')

    if (!max) max = 1

    const db = await getDatabase()

    await loginDropbox(db);
    await loginGoogle(db);

    const logUpdate = await getLogUpdate()

    console.log('')
    logUpdate.clear()

    const albumId = await getLastAlbumId(db)

    async function transfer(dbId: number) {

      const item = await readOneDropboxItemByDbId(db, dbId)

      await logTransferStatus('FETCHING', item)

      try {
        const downloadInfo = await downloadFile(item.path_lower);

        if (downloadInfo.dimensions.width < 361 && downloadInfo.dimensions.width < 361) {
          await updateDropboxItemStatus(db, dbId, 'LOOKS_SMALL')
          await logTransferStatus('TOO SMALL', item)
          return
        }

        const fileName = `${tempDir}/download-${dbId}`;
        fs.writeFileSync(fileName, downloadInfo.buffer)

        await logTransferStatus('UPLOADING', item, fileName, downloadInfo.dimensions)
        const uploadToken = await uploadMedia(downloadInfo)

        await logTransferStatus('LINKING', item, fileName, downloadInfo.dimensions)

        await createMediaItem({
          albumId,
          description: '',
          fileName: item.path_lower,
          uploadToken: uploadToken
        })
        await updateDropboxItemStatus(db, dbId, 'TRANSFERRED')
        await markTransferredOnDropbox(item.path_lower)

        await logTransferStatus('SUCCESS', item, fileName, downloadInfo.dimensions)

      } catch (e: any) {
        if (e.status === 409) {
          console.error(`Skipping MISSING item on Dropbox: ${item.path_lower}`)
          await updateDropboxItemStatus(db, dbId, 'MISSING')
        } else
          throw e
      }
    }

    const toTransfer = await findTransferable(db, max);

    for (const id of toTransfer) await transfer(id);
  })


export const add = new Command('add')
  .description('Enqueue DropBox path to search for images (recursively)')
  .argument('paths...')
  .action(async (paths) => {
    const db = await getDatabase()

    for (const path of paths)
      await insertSearchPath(db, decodeURIComponent(path))
  })
export const folders = new Command('folders')
  .description('Show Dropbox folders queued for migration')
  .action(async () => {
    const db = await getDatabase()
    const searchPaths = await readSearchPaths(db)
    for (const p of searchPaths)
      console.log(`${lpad(p.status, 15)}   ${p.path}`)
  })
export const discoverCmd = new Command('discover')
  .argument('[n]', 'number of Dropbox folders to scan (default 1)')
  .description('Discover new Dropbox files in queued folders')
  .action(async (n) => {

    if (!n) n = 1

    const db = await getDatabase()
    await oauthDropbox({
      clientId: process.env.DROPBOX_CLIENT_ID!,
      clientSecret: process.env.DROPBOX_CLIENT_SECRET!,
      tokenStore: await SqliteTokenStore.setup({db, provider: 'Dropbox'})
    })

    try {
      for (let i = 0; i < n; i++) {
        const searchPath = await readOnePendingSearchPath(db)
        if (searchPath)
          await enqueueDropboxFiles({
            searchPathId: searchPath.id,
            path: searchPath.path,
            cursor: searchPath.cursor
          })
      }
    } catch (err) {
      console.error(JSON.stringify(err))
    }

    async function enqueueDropboxFiles({
                                         searchPathId,
                                         path,
                                         cursor
                                       }: { searchPathId: number, path: string, cursor: string }) {
      try {
        const result = await listFolderResult(path, cursor)
        const files = selectFilesFromResult(result)
        await db.transaction(async () => {
          await updateSearchPathCursor(db, searchPathId, result.cursor)
          if (result.has_more) {
            await updateSearchPathStatus(db, searchPathId, 'DOWNLOADING')
          } else {
            await updateSearchPathStatus(db, searchPathId, 'DONE')
          }
          for (const f of files) await insertDropboxItem(db, f, searchPathId)
        })
      } catch (e) {
        if ((e as { status: number }).status === 409 &&
          (e as { error: { error_summary: string } }).error.error_summary.startsWith('path/not_found')) {
          console.error('Path not found, marking as failed')
          await updateSearchPathStatus(db, searchPathId, 'FAILED')
        } else
          console.error("error in enqueueDropboxFiles: ", e)
      }
    }
  })

const command = new Command('drop-drop-box')
command
  .description("CLI for transferring images from Dropbox to Google Photos")
  .option('-db, --database <db>', 'SQLLite3 database path', './dropbox-db.sqlite3')
  .addCommand(statsCmd)
  .addCommand(folders)

  .addCommand(loginCmd)
  .addCommand(logoutCmd)

  .addCommand(add)
  .addCommand(discoverCmd)
  .addCommand(createAlbumCmd)
  .addCommand(transferCmd)
  .parse(process.argv);


export async function getDatabase() {
  const dbPath = command.getOptionValue('database');
  const db = await Database.open(dbPath)
  await createTables(db)
  return db
}


