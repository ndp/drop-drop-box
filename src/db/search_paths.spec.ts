import {Database} from "sqlite-async";
import {
  createTableSearchPaths,
  insertSearchPath,
  readOnePendingSearchPath, readOneSearchPath, readSeachPaths, readSearchPathStats,
  updateSearchPathCursor, updateSearchPathStatus
} from './search_paths'
import {expect} from "chai";


describe('search_paths', () => {

  let db: Database

  beforeEach(async () => {
    db = await Database.open('', Database.OPEN_READWRITE) // in memory
    createTableSearchPaths(db)
  })


  specify('updateSearchPathCursor', async () => {
    const id = await insertSearchPath(db, '/foo/bar') as number

    let red = await readOneSearchPath(db, id)
    expect(red.cursor).to.equal(null)

    await updateSearchPathCursor(db, id, 'new-cursor')

    red = await readOneSearchPath(db, id)

    expect(red.cursor).to.equal('new-cursor')
  })

  specify('updateSearchPathStatus', async () => {
    const id = await insertSearchPath(db, '/foo/bar') as number

    let red = await readOneSearchPath(db, id)
    expect(red.cursor).to.equal(null)

    await updateSearchPathStatus(db, id, 'DOWNLOADING')

    red = await readOneSearchPath(db, id)
    expect(red.status).to.equal('DOWNLOADING')

    await updateSearchPathStatus(db, id, 'FAILED')

    red = await readOneSearchPath(db, id)
    expect(red.status).to.equal('FAILED')

    await updateSearchPathStatus(db, id, 'DONE')

    red = await readOneSearchPath(db, id)
    expect(red.status).to.equal('DONE')
  })


  specify('readOnePendingSearchPath', async () => {

    await insertSearchPath(db, '/foo/bar')

    let red = await readOnePendingSearchPath(db);
    expect(red.path).to.equal('/foo/bar')
    expect(red.status).to.equal('ENQUEUED')
    expect(red.cursor).to.equal(null)

    await insertSearchPath(db, '/foo/baz')

    while (red.path !== '/foo/baz')
      red = await readOnePendingSearchPath(db)

    expect(red.path).to.equal('/foo/baz')
    expect(red.status).to.equal('ENQUEUED')
    expect(red.cursor).to.equal(null)
  })

  specify('readSeachPaths', async () => {
    let p = await readSeachPaths(db)
    expect(p).to.deep.equal([])

    const a = await insertSearchPath(db, '/foo/bar/a')
    const b = await insertSearchPath(db, '/foo/bar/b')
    const c = await insertSearchPath(db, '/foo/bar/c')
    p = await readSeachPaths(db)
    expect(p.length).to.equal(3)
  })

  specify('readSearchPathStats', async () => {
    const a = await insertSearchPath(db, '/foo/bar/a')
    const b = await insertSearchPath(db, '/foo/bar/b')
    const c = await insertSearchPath(db, '/foo/bar/c')

    let stats = await readSearchPathStats(db)
    expect(stats['Total Search Paths']).to.equal(3)
    expect(stats['Search Paths - Enqueued']).to.equal(3)
    expect(stats['Search Paths - Downloading']).to.equal(0)
    expect(stats['Search Paths - Done']).to.equal(0)


    await updateSearchPathStatus(db, a!, 'DOWNLOADING')
    await updateSearchPathStatus(db, b!, 'DOWNLOADING')
    await updateSearchPathStatus(db, c!, 'DONE')

    stats = await readSearchPathStats(db)
    expect(stats['Total Search Paths']).to.equal(3)
    expect(stats['Search Paths - Enqueued']).to.equal(0)
    expect(stats['Search Paths - Downloading']).to.equal(2)
    expect(stats['Search Paths - Done']).to.equal(1)
  })
})
