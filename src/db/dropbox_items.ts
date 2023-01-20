import {Database} from 'sqlite-async'
import {DropboxFileImport} from '../dropbox_api'
import {tableHasColumn} from "../util";

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

type Status = 'FOUND' | 'TRANSFERRED' | 'MISSING'

export async function createTableDropboxItems(db: Database) {
  await db.exec(`CREATE TABLE IF NOT EXISTS dropbox_items (
                           id INTEGER PRIMARY KEY,
                           dropbox_id varchar(255) UNIQUE,
                           path_lower varchar(1024),
                           size integer,
                           content_hash varchar(255) UNIQUE,
                           status varchar(20) DEFAULT "FOUND",
                           search_path_id INTEGER NOT NULL,
                           mime_type VARCHAR(255) NOT NULL default 'application/octet-stream'
                           ); `);

  // example migration:
  // if (!tableHasColumn(db, 'dropbox_items', 'mime_type')) {
  //   await db.exec(`
  //   ALTER TABLE dropbox_items
  //   ADD COLUMN mime_type VARCHAR(255) NOT NULL DEFAULT 'application/octet-stream'
  //   `)
  // }
}

export async function dropboxItemsStats(db: Database) {
  const items = (await db.all<{ status: Status, count: number }>('SELECT status, COUNT(*) as count FROM dropbox_items GROUP BY status;'))
  return items.reduce((m, r) => {
    m[r.status] = r.count
    return m
  }, {} as Record<Status, number>)
}

export async function insertDropboxItem(db: Database, file: DropboxFileImport, searchPathId: number): Promise<number> {
  if (!file.content_hash) throw `No content hash for file: ${file.path_lower}`

  const existing = await readOneDropboxItemByContentHash(db, file.content_hash)

  console.log(`  insertFile`, file.path_lower, existing ? ' (already queued)' : '')
  if (existing)
    return Promise.resolve(existing.id)

  return db.run(`INSERT INTO dropbox_items (
                        dropbox_id, path_lower, size, content_hash, search_path_id
                        ) values ($1, $2, $3, $4, $5);`,
    [file.id, file.path_lower, file.size, file.content_hash, searchPathId])
    .then(result => result.lastID)
}

export async function readOneDropboxItemByDbId(db: Database, id
  : number) {
  const existing = await db.get<DropboxItemRecord>('SELECT * FROM dropbox_items WHERE id=?', [id])

  return existing || null
}

export async function updateDropboxItemStatus(db: Database, dbId: number, newStatus: Status) {
  // console.log(`updating search path status #${searchPathId} to ${newStatus}`)
  return await db.run(
    'UPDATE dropbox_items ' +
    'SET status=? ' +
    'WHERE id=?', [newStatus, dbId])
}


export async function findTransferrable(db: Database, max = 1) {
  const result = await db.all<{ ID: number }>(`
  SELECT id
  FROM dropbox_items
  WHERE status = "FOUND"
  AND mime_type LIKE "image/%"
  ORDER BY RANDOM()
  LIMIT ?`, [max])
  return result.map(r => r.ID)
}

export async function readOneDropboxItemByContentHash(db: Database, contentHash: string) {
  const existing = await db.get<DropboxItemRecord>('SELECT * FROM dropbox_items WHERE content_hash=?', [contentHash])

  return existing || null
}
