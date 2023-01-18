import fetch from 'node-fetch'
import {
  ERR_REFRESH_FAILED,
} from "./symbols";
import {
  TokenRecord, TokenResponse
} from "./types";
import {TokenStore} from './TokenStore'
import {buildQueryString} from "../util";
import {ProviderUrls} from "./ProviderUrlsSupported";


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
  private userAuthBaseUrl: string;

  constructor(options: {
                clientId: string,
                clientSecret: string,
                redirectUrl: string,
                tokenStore: TokenStore,
                providerUrls: ProviderUrls
              }
  ) {
    this._clientID = options.clientId
    this._clientSecret = options.clientSecret
    this._redirectURL = options.redirectUrl
    this.tokenStore = options.tokenStore
    this.userAuthBaseUrl = options.providerUrls.userAuthBase
    this.tokenUrl = options.providerUrls.token
  }

  get bearerToken() {
    return this.tokenStore.access_token
  }

  get redirectPort(): number {
    const url = new URL(this._redirectURL)
    return parseInt(url.port)
  }

  get redirectPath(): string {
    const url = new URL(this._redirectURL)
    return url.pathname
  }

  generateAuthUrl({
                    scope
                  }: {
    scope: string;
  }) {
    const opts = {
      access_type: 'offline', // Google
      token_access_type: 'offline', // Dropbox
      prompt: 'consent',
      response_type: 'code',
      scope,
      client_id: this._clientID,
      redirect_uri: this._redirectURL
    };

    return `${this.userAuthBaseUrl}?${buildQueryString(opts)}`;
  }

  /**
   * Exchange our original auth code for tokens
   * @param authCode provided authCode from callback. Should be decoded if necessary.
   *                 See decodeURIComponent
   */
  async exchangeAuthCodeForToken(authCode: string): Promise<TokenResponse> {

    const data = {
      code: authCode,
      client_id: this._clientID,
      client_secret: this._clientSecret,
      redirect_uri: this._redirectURL,
      grant_type: "authorization_code"
    };

    /*
    curl https://api.dropbox.com/oauth2/token \
    -d code=<AUTHORIZATION_CODE> \
    -d grant_type=authorization_code \
    -d redirect_uri=<REDIRECT_URI> \
    -u <APP_KEY>:<APP_SECRET>

     */
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

  hasRefreshToken(): boolean {
    return !!this.tokenStore.refresh_token
  }

  isAccessTokenExpired(): boolean {
    // If we don't have a token, it's time to refresh.
    // Also, if the expiry date is passed, it's time to refresh.
    return !this.tokenStore.access_token
      || !this.tokenStore.expiry_date
      || this.tokenStore!.expiry_date < (new Date().getTime() + REFRESH_THRESHOLD_MS)
  }

  refreshAccessToken(): Promise<TokenResponse> {

    if (!this.hasRefreshToken())
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
    /*
    curl https://api.dropbox.com/oauth2/token \
    -d grant_type=refresh_token \
    -d refresh_token=<REFRESH_TOKEN> \
    -u <APP_KEY>:<APP_SECRET>

     */
    const res = await this.fetcher({
      //url: this.userAuthBaseUrl,
      url: this.tokenUrl,
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
    // Dropbox does not return a new refresh token, per their docs.
    tokens.refresh_token ||= refreshToken
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

