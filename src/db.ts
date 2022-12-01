import { file_properties } from 'dropbox/types/dropbox_types'
import { Database } from '../../sqlite-async'
import { DropboxFile } from './dropbox'

interface Count {
  ['COUNT(*)']: number
}

export type SearchPath = {
  ID: number,
  path: string
  status: 'CREATED' | 'DONE',
  cursor: string,
  created_at: any
}

export async function createTables (db: Database) {
  await db.exec(`CREATE TABLE search_paths (
                           ID INTEGER PRIMARY KEY,
                           path varchar(1024) NOT NULL UNIQUE,
                           status varchar(20) NOT NULL DEFAULT "CREATED",
                           cursor varchar(255) DEFAULT NULL,
                           created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ); `)

  await db.exec(`CREATE TABLE dropbox_items (
                           ID INTEGER PRIMARY KEY,
                           dropbox_id varchar(255) UNIQUE,
                           path_lower varchar(1024),
                           size integer,
                           content_hash varchar(255) UNIQUE,
                           status varchar(20) DEFAULT "FOUND"
                           ); `)

}

export async function stats (db: Database) {
  const queries = (await db.get<Count>('SELECT COUNT(*) FROM search_paths;'))['COUNT(*)']
  const items = (await db.get<Count>('SELECT COUNT(*) FROM dropbox_items;'))['COUNT(*)']
  return { queries, items }
}

export function insertPathToSearch (db: Database, path: string) {
  return db.run(`insert into search_paths (path) values ($1);`, [path])
           .then(n => console.log(`added one path (${n})`))
           .catch(err => {
             if (err.code == 'SQLITE_CONSTRAINT')
               console.log('path already registered: ', path)
             else
               throw err;
           })
}

export async function updateSearchPathCursor (db: Database, searchPathId: number, cursor: file_properties.PropertiesSearchCursor) {
  console.log('updateSearchPathCursor', searchPathId, cursor)
  return await db.run('UPDATE search_paths SET cursor=$2 WHERE id=$1;', [searchPathId, cursor])
}

export async function updateSearchPathDone (db: Database, searchPathId: number) {
  console.log('updateSearchPathDone', searchPathId)
  return await db.run('UPDATE search_paths SET status="DONE" WHERE id=$1;', [searchPathId])
}

export async function getPendingPathToSearch (db: Database) {
  return await db.get<SearchPath>('SELECT * FROM search_paths WHERE status != "DONE" ORDER BY cursor DESC, RANDOM()')
}

export async function insertFile (db: Database, file: DropboxFile) {
  const existing = (await db.get<Count>('SELECT COUNT(*) FROM dropbox_items WHERE content_hash=$1', [file.content_hash]))['COUNT(*)']
  console.log(`  insertFile`, file.path_lower, existing > 0 ? ' (already queued)' : '')
  if (existing === 0)
    return db.run(`insert into dropbox_items (
                        dropbox_id, path_lower, size, content_hash
                        ) values ($1, $2, $3, $4);`,
                  [file.id, file.path_lower, file.size, file.content_hash])
}

