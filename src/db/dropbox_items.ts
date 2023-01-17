import {Database} from 'sqlite-async'
import { DropboxFileImport} from '../dropbox_api'

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
  await db.exec(`CREATE TABLE IF NOT EXISTS dropbox_items (
                           id INTEGER PRIMARY KEY,
                           dropbox_id varchar(255) UNIQUE,
                           path_lower varchar(1024),
                           size integer,
                           content_hash varchar(255) UNIQUE,
                           status varchar(20) DEFAULT "FOUND",
                           search_path_id INTEGER NOT NULL
                           ); `);

  const hasSearchPathIdColumn = (await db.get<Count>(`
  SELECT COUNT(*)
  FROM pragma_table_info('dropbox_items')
  WHERE name='search_path_id'`))['COUNT(*)'];

  if (!hasSearchPathIdColumn) {
    console.log('adding search_path_id column')
    const p = db.exec(`ALTER TABLE dropbox_items ADD COLUMN search_path_id INTEGER NOT NULL DEFAULT '-1'`)
      .catch(e => console.log('ignore because column already exists', e))
    await p


  }
}

export async function dropboxItemsStats(db: Database) {
  const items = (await db.get<Count>('SELECT COUNT(*) FROM dropbox_items;'))['COUNT(*)']
  return items
}

export async function insertDropboxItem(db: Database, file: DropboxFileImport, searchPathId: number): Promise<number> {
  if (!file.content_hash) throw `No content hash for file: ${file.path_lower}`

  const existing = await readOneDropboxItemByContentHash(db, file.content_hash)

  console.log(`  insertFile`, file.path_lower, existing ? ' (already queued)' : '')
  if (existing)
    return Promise.resolve(existing.id)

  return db.run(`INSERT INTO dropbox_items (
                        dropbox_id, path_lower, size, content_hash, search_path_id,
                        ) values ($1, $2, $3, $4, $5);`,
    [file.id, file.path_lower, file.size, file.content_hash, searchPathId])
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
