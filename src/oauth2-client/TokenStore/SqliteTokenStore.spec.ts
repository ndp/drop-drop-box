import {expect} from 'chai'
import {SqliteTokenStore} from "./SqliteTokenStore";
import {Database} from "sqlite-async";


describe('SqliteTokenStore', () => {

  let store: SqliteTokenStore

  specify('default (missing) values', async () => {
    const db = await Database.open('');
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    expect(store.expiry_date).to.equal(0)
    expect(store.access_token).to.equal('')
    expect(store.refresh_token).to.equal('')
  })


  specify('save and restore', async () => {
    const db = await Database.open('');
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    await store.save({
      access_token: "ACC355",
      expiry_date: 7,
      refresh_token: "R3FR35H"
    })
    expect(store.expiry_date).to.equal(7)
    expect(store.access_token).to.equal('ACC355')
    expect(store.refresh_token).to.equal('R3FR35H')

    // Make a new store and try it
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    expect(store.expiry_date).to.equal(7)
    expect(store.access_token).to.equal('ACC355')
    expect(store.refresh_token).to.equal('R3FR35H')
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
    expect(store.expiry_date).to.equal(3)
    expect(store.access_token).to.equal('ACC355 3')
    expect(store.refresh_token).to.equal('R3FR35H 3')

    // Make a new store and try it
    store = await SqliteTokenStore.setup({db, provider: 'my provider' as 'Dropbox'})
    expect(store.expiry_date).to.equal(3)
    expect(store.access_token).to.equal('ACC355 3')
    expect(store.refresh_token).to.equal('R3FR35H 3')
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

    expect(storeA.expiry_date).to.equal(0)
    expect(storeA.access_token).to.equal('')
    expect(storeA.refresh_token).to.equal('')

    expect(storeB.expiry_date).to.equal(10)
    expect(storeB.access_token).to.equal('ACC355 B')
    expect(storeB.refresh_token).to.equal('R3FR35H B')
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

    expect(store.expiry_date).to.equal(0)
    expect(store.access_token).to.equal('')
    expect(store.refresh_token).to.equal('')
  })
})
