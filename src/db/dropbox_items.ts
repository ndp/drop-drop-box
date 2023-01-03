import { Database } from 'sqlite-async'
import { DropboxFile } from '../dropbox'

interface Count {
  ['COUNT(*)']: number
}

export async function createTableDropboxItems (db: Database) {
  await db.exec(`CREATE TABLE dropbox_items (
                           ID INTEGER PRIMARY KEY,
                           dropbox_id varchar(255) UNIQUE,
                           path_lower varchar(1024),
                           size integer,
                           content_hash varchar(255) UNIQUE,
                           status varchar(20) DEFAULT "FOUND"
                           ); `)
}

export async function dropboxItemsStats (db: Database) {
  const items = (await db.get<Count>('SELECT COUNT(*) FROM dropbox_items;'))['COUNT(*)']
  return items
}

export async function insertDropboxItem (db: Database, file: DropboxFile) {
  const existing = (await db.get<Count>('SELECT COUNT(*) FROM dropbox_items WHERE content_hash=$1', [file.content_hash]))['COUNT(*)']
  console.log(`  insertFile`, file.path_lower, existing > 0 ? ' (already queued)' : '')
  if (existing === 0)
    return db.run(`insert into dropbox_items (
                        dropbox_id, path_lower, size, content_hash
                        ) values ($1, $2, $3, $4);`,
                  [file.id, file.path_lower, file.size, file.content_hash])
}
