import { Database } from '../../../sqlite-async'
import { insertSearchPath } from './search_paths'


const db = new Database() // in memory

describe('search_paths', () => {
  specify('saves new search paths', () => {
    insertSearchPath(db, '/foo/bar')
    insertSearchPath(db, '/foo/baz')
  })
})

