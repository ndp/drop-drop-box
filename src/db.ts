import { Database } from 'sqlite-async'
import { createTableDropboxItems, dropboxItemsStats } from './db/dropbox_items'
import { createTableSearchPaths, readSearchPathStats } from './db/search_paths'

export async function createTables (db: Database) {
  await createTableSearchPaths(db)
  await createTableDropboxItems(db)
}

export async function stats (db: Database) {
  const queries = await readSearchPathStats(db)
  const items = await dropboxItemsStats(db)
  return { queries, items }
}

