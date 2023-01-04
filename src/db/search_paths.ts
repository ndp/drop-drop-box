import {file_properties} from 'dropbox/types/dropbox_types'
import {Database} from 'sqlite-async'


type Status = 'ENQUEUED' | 'DOWNLOADING' | 'DONE'

export type SearchPath = {
  ID: number,
  path: string
  status: Status,
  cursor: string,
  created_at: any
}


interface Count {
  ['COUNT(*)']: number
}


export async function createTableSearchPaths(db: Database) {
  await db.exec(`CREATE TABLE search_paths (
                           ID INTEGER PRIMARY KEY,
                           path varchar(1024) NOT NULL UNIQUE,
                           status varchar(20) NOT NULL DEFAULT "ENQUEUED",
                           cursor varchar(255) DEFAULT NULL,
                           created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ); `)
}


export function insertSearchPath(db: Database, path: string): Promise<number | null> {
  return db.run(`insert into search_paths (path) values ($1);`, [path])
    .then(result => {
      console.log(`added one path (${JSON.stringify(result)})`);
      return result.lastID
    })
    .catch(err => {
      if (err.code != 'SQLITE_CONSTRAINT')
        throw err;
      console.log('path already registered: ', path)
      return null
    })
}


export async function updateSearchPathCursor(
  db: Database,
  searchPathId: number,
  cursor: file_properties.PropertiesSearchCursor) {
  return await db.run(
    'UPDATE search_paths ' +
    'SET cursor = ? ' +
    'WHERE id=?', [cursor, searchPathId])
}

export async function updateSearchPathStatus(db: Database, searchPathId: number, newStatus: Status) {
  return await db.run(
    'UPDATE search_paths ' +
    'SET status=? ' +
    'WHERE id=?', [newStatus, searchPathId])
}

export async function readOneSearchPath(db: Database, searchPathId: number) {
  return await db.get<SearchPath>('SELECT * FROM search_paths WHERE id=?', [searchPathId])
}


export async function readOnePendingSearchPath(db: Database) {
  return await db.get<SearchPath>('SELECT * FROM search_paths WHERE status != "DONE" ORDER BY cursor DESC, RANDOM()')
}


export async function readSearchPathStats(db: Database) {
  return {
    'Total Search Paths':
      (await db.get<Count>('SELECT COUNT(*) FROM search_paths;'))['COUNT(*)'],
    'Search Paths - Enqueued':
      (await db.get<Count>('SELECT COUNT(*) FROM search_paths WHERE status="ENQUEUED";'))['COUNT(*)'],
    'Search Paths - Downloading':
      (await db.get<Count>('SELECT COUNT(*) FROM search_paths WHERE status="DOWNLOADING";'))['COUNT(*)'],
    'Search Paths - Done':
      (await db.get<Count>('SELECT COUNT(*) FROM search_paths WHERE status="DONE";'))['COUNT(*)']


  }
}
