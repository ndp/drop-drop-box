import {GoogleToken, TokenStore} from "./types";

export class InMemoryTokenStore implements TokenStore {

  _tokens: GoogleToken | null = null

  get access_token() {
    return this._tokens?.access_token ?? ''
  }

  get refresh_token() {
    return this._tokens?.refresh_token ?? ''
  }

  get expiry_date() {
    return this._tokens?.expiry_date ?? 0
  }

  save(tokens: GoogleToken): void {
    this._tokens = tokens
  }
}
