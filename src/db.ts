import {Database} from 'sqlite-async'
import {createTableDropboxItems, dropboxItemsStats} from './db/dropbox_items'
import {createTableSearchPaths, readSearchPathStats} from './db/search_paths'
import {albumStats, createTableGoogleAlbums} from "./db/google_albums";

export async function createTables(db: Database) {
  await createTableSearchPaths(db)
  await createTableDropboxItems(db)
  await createTableGoogleAlbums(db)
}

export async function stats(db: Database) {
  const queries = await readSearchPathStats(db)
  const items = await dropboxItemsStats(db)
  const albums = await albumStats(db)
  return {queries, items, albums}
}

