import {Database} from "sqlite-async";


interface Count {
  ['COUNT(*)']: number
}

export type AlbumRecord = {
  id: number,
  name: string,
  albumId: string,
}

export async function createTableGoogleAlbums(db: Database) {
  await db.exec(`CREATE TABLE IF NOT EXISTS google_albums (
                           id INTEGER PRIMARY KEY,
                           name varchar(255) UNIQUE,
                           album_id varchar(1024),
                           created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ); `)
}

export async function albumStats(db: Database) {
  return (await db.get<Count>('SELECT COUNT(*) FROM google_albums;'))['COUNT(*)']
}


export async function saveAlbum(db: Database, albumId: string, name: string) {
  return db
    .run(`insert into google_albums (name, album_id) values (?,?);`,
      [name, albumId])
    .then(result => {
      return result.lastID
    })
    // .catch(err => {
    //   if (err.code != 'SQLITE_CONSTRAINT')
    //     throw err;
    // })
}


export async function getLastAlbumId(db: Database) {
  return db
    .get<{album_id: string}>('SELECT album_id FROM google_albums ORDER BY created_at DESC LIMIT 1')
    .then(res => res.album_id)
}
