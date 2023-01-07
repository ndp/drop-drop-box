#!/usr/bin/env node
// Object.defineProperty(exports, "__esModule", { value: true })

import * as dotenv from 'dotenv'
import Chalk from 'chalk'
import figlet from 'figlet'
import {Command} from 'commander'
import {Database} from 'sqlite-async'
import {createTables, stats} from './db'
import {listAlbums, listMediaItems, setUpGoogleOAuth, uploadMedia} from './google-photos'
import {
  insertSearchPath,
  readOnePendingSearchPath,
  readSeachPaths,
  updateSearchPathCursor,
  updateSearchPathStatus
} from "./db/search_paths";
import {lpad} from "./util";
import {getStream, listFolderResult, selectFilesFromResult, setUpDropboxApi} from "./dropbox";
import {insertDropboxItem, readOneDropboxItemById} from "./db/dropbox_items";
import {SqliteTokenStore} from "./oauth2-client/TokenStore/SqliteTokenStore";

dotenv.config()

console.log(
  Chalk.greenBright(
    figlet.textSync('drop-drop-box', {horizontalLayout: 'full'})
  )
);


export const status = new Command('status')
  .description('show current status')
  .action(async () => {
    console.log('status!')
    const db = await getDatabase()
    console.log('stats', await stats(db))
  })


const google = new Command('google')
  .description('google stuff')
  .action(async () => {


    //const mediaItems = await listMediaItems()
    // console.log(JSON.stringify({mediaItems}))

    const db = await getDatabase()
    const item = await readOneDropboxItemById(db, 2)
    console.log({item})

    setUpDropboxApi()

    const getStreamResponse = await getStream(item.path_lower)
    const download = getStreamResponse

    setUpGoogleOAuth({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      tokenStore: await SqliteTokenStore.setup(db)
    })
    const foo = uploadMedia(download)
    console.log({foo})

    // const albums = await listAlbums(authResult.tokens.access_token)
    // console.log(albums)
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
    const searchPaths = await readSeachPaths(db)
    for (const p of searchPaths)
      console.log(`${lpad(p.status, 15)}   ${p.path}`)
  })
export const discover = new Command('discover')
  .argument('[n]', 'number of Dropbox folders to scan (default 1)')
  .description('discover new Dropbox files in added folders')
  .action(async (n) => {
    setUpDropboxApi()

    if (!n) n = 1

    const db = await getDatabase()

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
          for (let f of files) await insertDropboxItem(db, f)
          // console.log(files.map(f => f.name));
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
  .addCommand(status)
  .addCommand(add)
  .addCommand(discover)
  .addCommand(folders)
  .addCommand(google)
  .parse(process.argv);


export async function getDatabase() {
  const dbPath = command.getOptionValue('database');
  const db = await Database.open(dbPath)
  await db.get<{ C: number }>('SELECT COUNT(*) AS C FROM dropbox_items')
    .then((r) => console.log(`Using database with ${JSON.stringify(r.C)} items`))
    .catch(async () => {
      console.log('creating tables')
      await createTables(db)
    })
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
