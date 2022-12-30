import { file_properties } from 'dropbox/types/dropbox_types'
import { Database } from '../../../sqlite-async'


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


export async function createTableSearchPaths (db: Database) {
  await db.exec(`CREATE TABLE search_paths (
                           ID INTEGER PRIMARY KEY,
                           path varchar(1024) NOT NULL UNIQUE,
                           status varchar(20) NOT NULL DEFAULT "ENQUEUED",
                           cursor varchar(255) DEFAULT NULL,
                           created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ); `)
}


export function insertSearchPath (db: Database, path: string) {
  return db.run(`insert into search_paths (path) values ($1);`, [path])
           .then(n => console.log(`added one path (${n})`))
           .catch(err => {
             if (err.code == 'SQLITE_CONSTRAINT')
               console.log('path already registered: ', path)
             else
               throw err;
           })
}


export async function updateSearchPathCursor (
  db: Database,
  searchPathId: number,
  cursor: file_properties.PropertiesSearchCursor) {
  //console.log('updateSearchPathCursor', searchPathId, cursor)
  return await db.run('UPDATE search_paths SET cursor=$2 WHERE id=$1;', [searchPathId, cursor])
}

export async function updateSearchPathDone (db: Database, searchPathId: number) {
  console.log('updateSearchPathDone', searchPathId)
  return await db.run('UPDATE search_paths SET status="DONE" WHERE id=$1;', [searchPathId])
}

export async function updateSearchPathStatus (db: Database, searchPathId: number, newStatus: Status) {
  console.log('updateSearchPathStatus', searchPathId, newStatus)
  return await db.run('UPDATE search_paths SET status="$2" WHERE id=$1;', [searchPathId, newStatus])
}

export async function readOnePendingSearchPath (db: Database) {
  return await db.get<SearchPath>('SELECT * FROM search_paths WHERE status != "DONE" ORDER BY cursor DESC, RANDOM()')
}


export async function readSearchPathStats (db: Database) {
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
