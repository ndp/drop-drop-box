import {Database} from "sqlite-async";
import {
  createTableSearchPaths,
  insertSearchPath,
  readOnePendingSearchPath, readOneSearchPath, readSearchPaths, readSearchPathStats,
  updateSearchPathCursor, updateSearchPathStatus
} from './search_paths'
import assert from "node:assert";


describe('search_paths', () => {

  let db: Database

  beforeEach(async () => {
    db = await Database.open('', Database.OPEN_READWRITE) // in memory
    await createTableSearchPaths(db)
  })


  specify('updateSearchPathCursor', async () => {
    const id = await insertSearchPath(db, '/foo/bar') as number

    let red = await readOneSearchPath(db, id)
    assert.equal(null, red.cursor)

    await updateSearchPathCursor(db, id, 'new-cursor')

    red = await readOneSearchPath(db, id)

    assert.equal('new-cursor', red.cursor)
  })

  specify('updateSearchPathStatus', async () => {
    const id = await insertSearchPath(db, '/foo/bar') as number

    let red = await readOneSearchPath(db, id)
    assert.equal(null, red.cursor)

    await updateSearchPathStatus(db, id, 'DOWNLOADING')

    red = await readOneSearchPath(db, id)
    assert.equal('DOWNLOADING', red.status)

    await updateSearchPathStatus(db, id, 'FAILED')

    red = await readOneSearchPath(db, id)
    assert.equal('FAILED', red.status)

    await updateSearchPathStatus(db, id, 'DONE')

    red = await readOneSearchPath(db, id)
    assert.equal('DONE', red.status)
  })


  specify('readOnePendingSearchPath', async () => {

    await insertSearchPath(db, '/foo/bar')

    let red = await readOnePendingSearchPath(db);
    assert.equal('/foo/bar', red.path)
    assert.equal('ENQUEUED', red.status)
    assert.equal(null, red.cursor)

    await insertSearchPath(db, '/foo/baz')

    while (red.path !== '/foo/baz')
      red = await readOnePendingSearchPath(db)

    assert.equal('/foo/baz', red.path)
    assert.equal('ENQUEUED', red.status)
    assert.equal(null, red.cursor)
  })

  specify('readSearchPaths', async () => {
    let p = await readSearchPaths(db)
    assert.deepEqual(([]), p)

    await insertSearchPath(db, '/foo/bar/a')
    await insertSearchPath(db, '/foo/bar/b')
    await insertSearchPath(db, '/foo/bar/c')
    p = await readSearchPaths(db)
    assert.equal(3, p.length)
  })

  specify('readSearchPathStats', async () => {
    const a = await insertSearchPath(db, '/foo/bar/a')
    const b = await insertSearchPath(db, '/foo/bar/b')
    const c = await insertSearchPath(db, '/foo/bar/c')

    let stats = await readSearchPathStats(db)
    assert.equal(3, stats['Total Search Paths'])
    assert.equal(3, stats['Search Paths - Enqueued'])
    assert.equal(0, stats['Search Paths - Downloading'])
    assert.equal(0, stats['Search Paths - Done'])


    await updateSearchPathStatus(db, a!, 'DOWNLOADING')
    await updateSearchPathStatus(db, b!, 'DOWNLOADING')
    await updateSearchPathStatus(db, c!, 'DONE')

    stats = await readSearchPathStats(db)
    assert.equal(3, stats['Total Search Paths'])
    assert.equal(0, stats['Search Paths - Enqueued'])
    assert.equal(2, stats['Search Paths - Downloading'])
    assert.equal(1, stats['Search Paths - Done'])
  })
})
