import {Database} from 'sqlite-async'
import { DropboxFileImport} from '../dropbox'

interface Count {
  ['COUNT(*)']: number
}

export type DropboxItemRecord = {
  id: number,
  dropbox_id: string,
  size: number,
  status: 'FOUND'
  path_lower: string,
  content_hash: string,
}

export async function createTableDropboxItems(db: Database) {
  await db.exec(`CREATE TABLE dropbox_items (
                           id INTEGER PRIMARY KEY,
                           dropbox_id varchar(255) UNIQUE,
                           path_lower varchar(1024),
                           size integer,
                           content_hash varchar(255) UNIQUE,
                           status varchar(20) DEFAULT "FOUND"
                           ); `)
}

export async function dropboxItemsStats(db: Database) {
  const items = (await db.get<Count>('SELECT COUNT(*) FROM dropbox_items;'))['COUNT(*)']
  return items
}

export async function insertDropboxItem(db: Database, file: DropboxFileImport): Promise<number> {
  if (!file.content_hash) throw `No content hash for file: ${file.path_lower}`

  const existing = await readOneDropboxItemByContentHash(db, file.content_hash)

  console.log(`  insertFile`, file.path_lower, existing ? ' (already queued)' : '')
  if (existing)
    return Promise.resolve(existing.id)

  return db.run(`insert into dropbox_items (
                        dropbox_id, path_lower, size, content_hash
                        ) values ($1, $2, $3, $4);`,
    [file.id, file.path_lower, file.size, file.content_hash])
    .then(result => result.lastID)
}

export async function readOneDropboxItemById(db: Database, id
  : number) {
  const existing = await db.get<DropboxItemRecord>('SELECT * FROM dropbox_items WHERE id=?', [id])

  return existing || null
}

export async function readOneDropboxItemByContentHash(db: Database, contentHash: string) {
  const existing = await db.get<DropboxItemRecord>('SELECT * FROM dropbox_items WHERE content_hash=?', [contentHash])

  return existing || null
}
