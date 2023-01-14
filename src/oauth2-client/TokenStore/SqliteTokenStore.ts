import {Database} from 'sqlite-async'
import {Storable, TokenStore} from "./index";


export class SqliteTokenStore implements TokenStore {

  private _access_token: string = ''
  private _refresh_token: string = ''
  private _expiry_date: number = 0

  static async setup(db: Database) {
    const store = new SqliteTokenStore(db)
    await store.createTableOAuthTokens()
    await store.loadFromDb()
    return store
  }

  constructor(private db: Database) {
  }

  async save(tokens: Storable) {
    this._access_token = tokens.access_token
    this._refresh_token = tokens.refresh_token
    this._expiry_date = tokens.expiry_date!

    await this.db.run('DELETE FROM oauth_tokens')
    await this.db.run('INSERT INTO oauth_tokens ' +
      '(access_token, refresh_token, expiry_date) VALUES(?,?,?)',
      [this._access_token, this._refresh_token, this._expiry_date])
  }

  get refresh_token(): string {
    return this._refresh_token;
  }

  get access_token(): string {
    return this._access_token;
  }

  get expiry_date(): number | undefined {
    return this._expiry_date;
  }

  async createTableOAuthTokens() {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS oauth_tokens (
                           access_token   varchar(1024) NOT NULL UNIQUE,
                           refresh_token  varchar(1024) NOT NULL UNIQUE,
                           expiry_date    integer DEFAULT NULL
                           ); `)
  }

  private async loadFromDb(): Promise<void> {
    const record = await this.db.get<Required<Storable>>('SELECT * FROM oauth_tokens')
    if (!record) return

    // console.log('** found saved OAuth tokens; reloading...', record, new Date(record.expiry_date))
    this._access_token = record.access_token
    this._refresh_token = record.refresh_token
    this._expiry_date = record.expiry_date
  }

  async resetTokens() {
    await this.db.run('DELETE FROM oauth_tokens')
  }

}

