import {Database} from "sqlite-async";
import {
  createTableDropboxItems,
  dropboxItemsStats,
  insertDropboxItem,
  readOneDropboxItemByContentHash,
  readOneDropboxItemByDbId
} from "./dropbox_items";
import {DropboxFileImport} from "../dropbox_api";
import assert from "node:assert";


// function mockUpDropboxItem() {
//   const file: DropboxItem = {
//     id: 3,
//     status: 'FOUND',
//     content_hash: 'abc',
//     dropbox_id: "abc",
//     // name: 'abc',
//     path_lower: 'abc',
//     // preview_url: 'abc',
//     size: 1000
//
//   }
//   return file;
// }


function mockUpDropboxFileImport(): DropboxFileImport {
  return {
    ".tag": "file",
    content_hash: 'abc',
    export_info: undefined,
    file_lock_info: undefined,
    has_explicit_shared_members: false,
    id: "abc",
    media_info: undefined,
    name: 'abc',
    path_lower: 'abc',
    preview_url: 'abc',
    property_groups: undefined,
    size: 1000
  };
}

describe('dropbox_items', () => {

  let db: Database

  beforeEach(async () => {
    db = await Database.open('', Database.OPEN_READWRITE) // in memory
    createTableDropboxItems(db)
  })


  specify('insertDropboxItem', async () => {

    const file = mockUpDropboxFileImport();
    const id = await insertDropboxItem(db, file, 9)

    const red = await readOneDropboxItemByContentHash(db, file.content_hash!);
    assert.equal(id, red.id)


    // insert again?
    const id2 = await insertDropboxItem(db, file, 9)
    assert.equal(id, id2)
  })

  specify('readOneDropboxItemById', async () => {

    assert.equal(null, await readOneDropboxItemByDbId(db, 0))
    assert.equal(null, await readOneDropboxItemByDbId(db, 1))

    const file = mockUpDropboxFileImport();
    const id = await insertDropboxItem(db, file, 9)

    const red = await readOneDropboxItemByDbId(
      db,
      id);
    assert.equal(id, red.id)
    assert.equal(file.content_hash, red.content_hash)
    assert.equal(file.path_lower, red.path_lower)
  })


  specify('readOneDropboxItemByContentHash', async () => {

    assert.equal(null, await readOneDropboxItemByContentHash(db, ''))
    assert.equal(null, await readOneDropboxItemByContentHash(db, 'not there'))

    const file = mockUpDropboxFileImport();
    const id = await insertDropboxItem(db, file, 9)

    const red = await readOneDropboxItemByContentHash(
      db,
      file.content_hash!);
    assert.equal(id, red.id)
    assert.equal(file.path_lower, red.path_lower)
  })


  specify('dropboxItemsStats', async () => {
    assert.deepEqual(({}), await dropboxItemsStats(db))
    const file = mockUpDropboxFileImport();
    const id = await insertDropboxItem(db, file, 9)

    assert.equal(1, id)
    assert.deepEqual(({ FOUND: 1}), await dropboxItemsStats(db))

  })


})
