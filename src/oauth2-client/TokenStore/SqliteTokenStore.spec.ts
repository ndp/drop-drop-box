import {SqliteTokenStore} from "./SqliteTokenStore";
import {Database} from "sqlite-async";
import assert from "node:assert";


describe('SqliteTokenStore', () => {

  let store: SqliteTokenStore

  specify('default (missing) values', async () => {
    const db = await Database.open('');
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    assert.equal(0, store.expiry_date)
    assert.equal('', store.access_token)
    assert.equal('', store.refresh_token)
  })


  specify('save and restore', async () => {
    const db = await Database.open('');
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    await store.save({
      access_token: "ACC355",
      expiry_date: 7,
      refresh_token: "R3FR35H"
    })
    assert.equal(7, store.expiry_date)
    assert.equal('ACC355', store.access_token)
    assert.equal('R3FR35H', store.refresh_token)

    // Make a new store and try it
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    assert.equal(7, store.expiry_date)
    assert.equal('ACC355', store.access_token)
    assert.equal('R3FR35H', store.refresh_token)
  })

  specify('save multiple times', async () => {
    const db = await Database.open('');
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    await store.save({
      access_token: "ACC355 1",
      expiry_date: 1,
      refresh_token: "R3FR35H 1"
    })
    await store.save({
      access_token: "ACC355 2",
      expiry_date: 2,
      refresh_token: "R3FR35H 2"
    })
    await store.save({
      access_token: "ACC355 3",
      expiry_date: 3,
      refresh_token: "R3FR35H 3"
    })
    assert.equal(3, store.expiry_date)
    assert.equal('ACC355 3', store.access_token)
    assert.equal('R3FR35H 3', store.refresh_token)

    // Make a new store and try it
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    assert.equal(3, store.expiry_date)
    assert.equal('ACC355 3', store.access_token)
    assert.equal('R3FR35H 3', store.refresh_token)
  })

  specify('multiple providers', async () => {
    const db = await Database.open('');
    let storeA = await SqliteTokenStore.setup({db, provider: 'A' as 'Dropbox'})
    await storeA.save({
      access_token: "ACC355 A",
      expiry_date: 5,
      refresh_token: "R3FR35H A"
    })

    let storeB = await SqliteTokenStore.setup({db, provider: 'B' as 'Dropbox'})
    await storeB.save({
      access_token: "ACC355 B",
      expiry_date: 10,
      refresh_token: "R3FR35H B"
    })

    // Make sure these are separate from one another
    await storeA.resetTokens()
    storeA = await SqliteTokenStore.setup({db, provider: 'A' as 'Dropbox'})
    storeB = await SqliteTokenStore.setup({db, provider: 'B' as 'Dropbox'})

    assert.equal(0, storeA.expiry_date)
    assert.equal('', storeA.access_token)
    assert.equal('', storeA.refresh_token)

    assert.equal(10, storeB.expiry_date)
    assert.equal('ACC355 B', storeB.access_token)
    assert.equal('R3FR35H B', storeB.refresh_token)
  })

  specify('resetTokens', async () => {
    const db = await Database.open('');
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    await store.save({
      access_token: "ACC355",
      expiry_date: 7,
      refresh_token: "R3FR35H"
    })

    await store.resetTokens()

    assert.equal(0, store.expiry_date)
    assert.equal('', store.access_token)
    assert.equal('', store.refresh_token)
  })
})
