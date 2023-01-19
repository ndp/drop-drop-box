import {Database} from 'sqlite-async'
import {Storable, TokenStore} from "./index";
import {ProviderKey} from "../ProviderUrlsSupported";


export class SqliteTokenStore implements TokenStore {

  private _access_token = ''
  private _refresh_token = ''
  private _expiry_date = 0

  static async setup({db, provider}:
                       { db: Database, provider: ProviderKey }) {
    const store = new SqliteTokenStore(db, provider)
    await store.createTableOAuthTokens()
    await store.loadFromDb()
    return store
  }

  private constructor(private db: Database, readonly provider: ProviderKey) {
  }

  async save(tokens: Storable) {
    this._access_token = tokens.access_token
    this._refresh_token = tokens.refresh_token
    this._expiry_date = tokens.expiry_date ?? 0

    await this.db.run('DELETE FROM oauth_tokens WHERE provider=?', this.provider)
    await this.db.run('INSERT INTO oauth_tokens ' +
      '(access_token, refresh_token, expiry_date, provider) VALUES(?,?,?,?)',
      [this._access_token, this._refresh_token, this._expiry_date, this.provider])
  }

  get refresh_token(): string {
    return this._refresh_token
  }

  get access_token(): string {
    return this._access_token
  }

  get expiry_date(): number {
    return this._expiry_date;
  }

  async createTableOAuthTokens() {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS oauth_tokens (
                           access_token   varchar(1024) NOT NULL UNIQUE,
                           refresh_token  varchar(1024) NOT NULL UNIQUE,
                           expiry_date    integer DEFAULT NULL,
                           provider       varchar(64) NOT NULL UNIQUE
                           ); `)
  }

  private async loadFromDb(): Promise<void> {
    const record = await this.db.get<Required<Storable>>('SELECT * FROM oauth_tokens WHERE provider=?', [this.provider])

    this._access_token = record?.access_token ?? ''
    this._refresh_token = record?.refresh_token ?? ''
    this._expiry_date = record?.expiry_date ?? 0
  }

  async resetTokens() {
    await this.db.run('DELETE FROM oauth_tokens WHERE provider=?', [this.provider])
    return this.loadFromDb()
  }

}

