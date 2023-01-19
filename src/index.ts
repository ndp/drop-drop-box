#!/usr/bin/env node
// Object.defineProperty(exports, "__esModule", { value: true })

import * as dotenv from 'dotenv'
import Chalk from 'chalk'
import figlet from 'figlet'
import {Command} from 'commander'
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
import {lpad} from "./util";
import {
  getStream,
  listFolderResult,
  markTransferredOnDropbox,
  oauthDropbox,
  selectFilesFromResult
} from "./dropbox_api";
import {
  findTransferrable,
  insertDropboxItem,
  readOneDropboxItemByDbId,
  updateDropboxItemStatus
} from "./db/dropbox_items";
import {SqliteTokenStore} from "./oauth2-client/TokenStore/SqliteTokenStore";
import {TokenStore} from "./oauth2-client/TokenStore";
import {getLastAlbumId, saveAlbum} from "./db/google_albums";

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
  .argument('[google|dropbox]', 'provide to authenticate', 'all')
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
  .argument('[google|dropbox]', 'provide to authenticate', 'all')
  .description('Reset the persisted auth and log in again')
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
  .description('show current DB stats')
  .action(async () => {
    const db = await getDatabase()
    console.log('*** Stats ***', await stats(db))
  })

const createAlbumCmd = new Command('album')
  .description('create new album on Google photos')
  .argument('name', 'name of album')
  .action(async (name: string) => {
    const db = await getDatabase()
    await loginGoogle(db);

    const albumId = await createAlbum(name)

    await saveAlbum(db, albumId, name)
  })

const transferCmd = new Command('transfer')
  .description('transfer queued files from Dropbox to Google Photos')
  .argument('[n]', 'number files to move')
  .action(async (max) => {

    if (!max) max = 1

    const db = await getDatabase()

    await loginDropbox(db);
    await loginGoogle(db);

    const albumId = await getLastAlbumId(db)

    async function transfer(dbId: number) {
      console.log(`Transferring item id ${dbId}:`)
      const item = await readOneDropboxItemByDbId(db, dbId)
      try {
        const downloadStream = await getStream(item.path_lower)

        const uploadToken = await uploadMedia(downloadStream)
        // console.log({uploadToken: JSON.stringify(uploadToken)})

        const googleResponse = await createMediaItem({
          albumId,
          description: '',
          fileName: item.path_lower,
          uploadToken: uploadToken
        })

        const dropboxResult = await markTransferredOnDropbox(item.path_lower)
        const dbResponse = await updateDropboxItemStatus(db, dbId, 'TRANSFERRED')

        console.log('   ... success')
        // console.log('---> ', {googleResponse, dropboxResult, dbResponse})

      } catch (e: any) {
        if (e.status === 409) {
          console.error(`Skipping MISSING item on Dropbox: ${item.path_lower}`)
          await updateDropboxItemStatus(db, dbId, 'MISSING')
        } else
          throw e
      }
    }

    const toTransfer = await findTransferrable(db, max);

    for (const id of toTransfer) await transfer(id);
  })


export const add = new Command('add')
  .description('add DropBox path to search for images')
  .argument('paths...')
  .action(async (paths) => {
    const db = await getDatabase()

    for (const path of paths)
      await insertSearchPath(db, decodeURIComponent(path))
//    await insertSearchPath(db, '/Tanyandy/Photos/2011/Originals/2011/Mar 29, 2011')
  })
export const folders = new Command('folders')
  .description('show Dropbox folders')
  .action(async () => {
    const db = await getDatabase()
    const searchPaths = await readSearchPaths(db)
    for (const p of searchPaths)
      console.log(`${lpad(p.status, 15)}   ${p.path}`)
  })
export const discoverCmd = new Command('discover')
  .argument('[n]', 'number of Dropbox folders to scan (default 1)')
  .description('discover new Dropbox files in added folders')
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
      console.log('--> enqueueDropboxFiles', {path, cursor, searchPathId})
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
  .description("CLI for transferring files from Dropbox to Google Photos")
  .option('-db, --database <db>', 'SQLLite3 database path', './dropbox-db.sqlite3')
  .option('-V, --verbose', 'Lotsa logging', false)
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


// .cursor
// .has_more
/*

 {
      '.tag': 'file',
      name: '1Password Emergency Kit A3-86K84C-my.pdf',
      path_lower: '/1password emergency kit a3-86k84c-my.pdf',
      path_display: '/1Password Emergency Kit A3-86K84C-my.pdf',
      id: 'id:1BR6ng55q5oAAAAAAASt3A',
      client_modified: '2021-09-24T16:20:30Z',
      server_modified: '2021-09-24T16:20:33Z',
      rev: '5ccc020765fe9006095a9',
      size: 77322,
      is_downloadable: true,
      content_hash: '30c6a1bf25e7f94e3a07e37631c601d81241f49b9e4af85cc03a4300710dbeb7'
    }

 */
