import fetch from 'node-fetch'
import {
  ERR_REFRESH_FAILED,
} from "./symbols";
import {
  TokenRecord, TokenResponse
} from "./types";
import {TokenStore} from './TokenStore'
import {buildQueryString} from "../util";


// How much time do we need left on the refresh token before
// we request a "refresh"?
const REFRESH_THRESHOLD_MS = 60 * 1000

export class OAuth2Client {

  protected _refreshTokenPromises: Map<string, Promise<TokenResponse>> = new Map();
  protected _clientID: string
  protected _clientSecret: string
  protected _redirectURL: string
  public tokenStore: TokenStore
  private tokenUrl: string;
  private authBaseUrl: string;

  constructor(options: {
                clientId: string,
                clientSecret: string,
                redirectUrl: string,
                tokenStore: TokenStore,
                authBaseUrl: string,
                tokenUrl: string
              }
  ) {
    this._clientID = options.clientId
    this._clientSecret = options.clientSecret
    this._redirectURL = options.redirectUrl
    this.tokenStore = options.tokenStore
    this.authBaseUrl = options.authBaseUrl
    this.tokenUrl = options.tokenUrl
  }

  get bearerToken() {
    return this.tokenStore.access_token
  }

  generateAuthUrl({
                    access_type,
                    prompt,
                    response_type = "code",
                    scope: rawScope
                  }: {
    access_type: string;
    prompt: string;
    response_type?: string;
    scope: Array<string> | string;
  }) {
    const scope = Array.isArray(rawScope) ? rawScope.join(" ") : rawScope;
    const opts = {
      access_type,
      scope,
      prompt,
      response_type,
      client_id: this._clientID,
      redirect_uri: this._redirectURL
    };
    return `${this.authBaseUrl}?${buildQueryString(opts)}`;
  }

  async exchangeAuthCodeForToken(authCode: string): Promise<TokenResponse> {

    const decodedAuthCode = decodeURIComponent(authCode);

    const data = {
      code: decodedAuthCode,
      client_id: this._clientID,
      client_secret: this._clientSecret,
      redirect_uri: this._redirectURL,
      grant_type: "authorization_code"
    };

    const res = await this.fetcher({
      url: this.tokenUrl,
      method: "POST",
      body: buildQueryString(data),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    const {data: tokens} = res;
    this.saveTokens(tokens)
    return {
      tokens,
      res
    };
  }

  hasValidRefreshToken(): boolean {
    return !!this.tokenStore.refresh_token &&
      !!this.tokenStore.expiry_date &&
      this.tokenStore.expiry_date > new Date().getTime()
  }

  isTimeToRefresh(): boolean {
    return this.hasValidRefreshToken() &&
      this.tokenStore!.expiry_date! < (new Date().getTime() + REFRESH_THRESHOLD_MS)
  }

  refreshAccessToken(): Promise<TokenResponse> {

    if (!this.hasValidRefreshToken())
      throw "No valid refresh token"

    const refreshToken = this.tokenStore.refresh_token

    // There's a cache here to prevent a race condition, wherein
    // we ask for a refresh token in the middle of already asking
    // for one.
    // This could be an interesting abstraction TODO
    if (this._refreshTokenPromises.has(refreshToken)) {
      return this._refreshTokenPromises.get(refreshToken)!;
    }

    const refreshTokenPromise = this
      .refreshAccessTokenNoCache(refreshToken)
      .then(rt => {
        this._refreshTokenPromises.delete(refreshToken);
        return rt;
      })
      .catch(err => {
        this._refreshTokenPromises.delete(refreshToken);
        throw err;
      });
    this._refreshTokenPromises.set(refreshToken, refreshTokenPromise);
    return refreshTokenPromise;
  }

  private async refreshAccessTokenNoCache(
    refreshToken: string
  ): Promise<TokenResponse> {
    const data = {
      refresh_token: refreshToken,
      client_id: this._clientID,
      client_secret: this._clientSecret,
      grant_type: "refresh_token"
    };
    const res = await this.fetcher({
      url: this.authBaseUrl,
      method: "POST",
      body: buildQueryString(data),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      validateStatus: () => true
    });
    const {data: tokens, status, statusText} = res;
    if (status >= 400 || status < 200) {
      throw new Error(`Bad refresh response ${JSON.stringify({
        code: ERR_REFRESH_FAILED,
        status,
        statusText
      })}`);
    }
    this.saveTokens(tokens)
    return {
      tokens,
      res
    };
  }

  private saveTokens(tokens: TokenRecord) {
    if (tokens?.expires_in) {
      tokens.expiry_date = new Date().getTime() + tokens.expires_in * 1000;
      delete tokens.expires_in;
    }
    this.tokenStore.save(tokens)
  }


  async fetcher({url, ...rest}: any) {
    // this is replacing cowl lib
    const response = await fetch(url, rest)
    const data = await response.json().catch(e => {
      console.log(`Cannot parse JSON response from ${url}.`)
      return null
    });
    return {
      status: response.status,
      statusText: response.statusText,
      data: data
    }
  }

}

