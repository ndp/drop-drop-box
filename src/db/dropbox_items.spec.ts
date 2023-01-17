import {Database} from "sqlite-async";
import {expect} from "chai";
import {
  createTableDropboxItems,
  dropboxItemsStats,
  insertDropboxItem,
  readOneDropboxItemByContentHash,
  readOneDropboxItemByDbId
} from "./dropbox_items";
import {DropboxFileImport} from "../dropbox_api";


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
    const id = await insertDropboxItem(db, file)

    const red = await readOneDropboxItemByContentHash(db, file.content_hash!);
    expect(red.id).to.equal(id)


    // insert again?
    const id2 = await insertDropboxItem(db, file)
    expect(id2).to.equal(id)
  })

  specify('readOneDropboxItemById', async () => {

    expect(await readOneDropboxItemByDbId(db, 0)).to.equal(null)
    expect(await readOneDropboxItemByDbId(db, 1)).to.equal(null)

    const file = mockUpDropboxFileImport();
    const id = await insertDropboxItem(db, file)

    const red = await readOneDropboxItemByDbId(
      db,
      id);
    expect(red.id).to.equal(id)
    expect(red.content_hash).to.equal(file.content_hash)
    expect(red.path_lower).to.equal(file.path_lower)
  })


  specify('readOneDropboxItemByContentHash', async () => {

    expect(await readOneDropboxItemByContentHash(db, '')).to.equal(null)
    expect(await readOneDropboxItemByContentHash(db, 'not there')).to.equal(null)

    const file = mockUpDropboxFileImport();
    const id = await insertDropboxItem(db, file)

    const red = await readOneDropboxItemByContentHash(
      db,
      file.content_hash!);
    expect(red.id).to.equal(id)
    expect(red.path_lower).to.equal(file.path_lower)
  })


  specify('dropboxItemsStats', async () => {
    expect(await dropboxItemsStats(db)).to.equal(0)
    const file = mockUpDropboxFileImport();
    const id = await insertDropboxItem(db, file)

    expect(id).to.equal(1)
    expect(await dropboxItemsStats(db)).to.equal(1)

  })


})
