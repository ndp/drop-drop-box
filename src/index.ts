#!/usr/bin/env node
// Object.defineProperty(exports, "__esModule", { value: true })

import * as dotenv from 'dotenv'

dotenv.config()
import Chalk from 'chalk'
import figlet from 'figlet'
import { Command } from 'commander'
import { Database } from 'sqlite-async'
import {
  createTables, getPendingPathToSearch,
  insertFile,
  insertPathToSearch,
  stats,
  updateSearchPathCursor,
  updateSearchPathDone
} from './db.js'
import { listFolderResult, selectFilesFromResult, setUpDropboxApi } from './dropbox.js'
import { auth } from './google-photos.js'

console.log(
  Chalk.greenBright(
    figlet.textSync('drop-drop-box', { horizontalLayout: 'full' })
  )
);


const command = new Command('drop-drop-box')
command
  .description("CLI for transferring files from Dropbox to Google Photos")
  .option('-d, --database', 'SQLLite3 database path', './dropbox-db.sqlite3')
  .option('-p, --path <path>', 'Add the specified path within DropBox')
  // .option('-C, --no-cheese', 'You do not want any cheese')
  .parse(process.argv);

const dbPath = command.getOptionValue('database');

(async function () {
  console.log(await auth())

  const db = await Database.open(dbPath)

  await db.get<{ C: number }>('SELECT COUNT(*) AS C FROM dropbox_items')
          .then((r) => console.log(`found ${JSON.stringify(r.C)} items`))
          .catch(async () => {
            console.log('creating tables')
            await createTables(db)
          })

  const path = command.getOptionValue('path')
  if (path)
    await insertPathToSearch(db, path)
  await insertPathToSearch(db, '/Tanyandy/Photos/2011/Originals/2011/Mar 29, 2011')

  console.log('stats', await stats(db))

  setUpDropboxApi()

  for (let i = 0; i < 3; i++) {
    const searchPath = await getPendingPathToSearch(db)
    if (searchPath)
      await enqueueDropboxFiles({
                            searchPathId: searchPath.ID,
                            path:         searchPath.path,
                            cursor:       searchPath.cursor
                          })
  }

  async function enqueueDropboxFiles ({
                                        searchPathId,
                                        path,
                                        cursor
                                      }: { searchPathId: number, path: string, cursor: string }) {
    console.log('--> enqueueDropboxFiles', { path, cursor })
    try {
      const result = await listFolderResult(path, cursor)
      const files = selectFilesFromResult(result)
      await db.transaction(async () => {
        if (result.has_more) {
          await updateSearchPathCursor(db, searchPathId, result.cursor)
        } else {
          await updateSearchPathDone(db, searchPathId)
        }
        for (let f of files) await insertFile(db, f)
        // console.log(files.map(f => f.name));
      })
    } catch (e) {
      console.error("error in enqueueDropboxFiles: ", e)
    }
  }

  // await enqueueDropboxFiles('/Tanyandy/Photos/Baby')
  // await enqueueDropboxFiles('Tanyandy/Photos/2011/Originals/2011/Mar 29, 2011')
  // await enqueueDropboxFiles('/Tanyandy/Photos/2011/Originals/2011/Mar%2029%2C%202011')
  process.exit(0)
})()
// dbx.filesDownload
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
