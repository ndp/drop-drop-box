import fetch from 'node-fetch'
import {stringify} from "query-string";
import EventEmitter from "eventemitter3";
import {
  ERR_REFRESH_FAILED,
  GOOGLE_OAUTH2_AUTH_BASE_URL,
  GOOGLE_OAUTH2_TOKEN_URL
} from "./symbols";
import {
  GoogleToken, GoogleTokenResponse, TokenStore
} from "./types";


const REFRESH_THRESHOLD_MS = 60 * 1000

export class OAuth2Client extends EventEmitter {

  protected _refreshTokenPromises: Map<string, Promise<GoogleTokenResponse>> = new Map();

  constructor(protected _clientID: string,
              protected _clientSecret: string,
              protected _redirectURL: string,
              public tokenStore: TokenStore) {
    super();
  }

  get bearerToken() {
    return this.tokenStore.access_token
  }

  generateAuthUrl(config: {
    access_type: string;
    prompt: string;
    response_type?: string;
    scope: Array<string> | string;
  }) {
    const {
      access_type,
      scope: rawScope,
      prompt,
      response_type = "code"
    } = config;
    const scope = Array.isArray(rawScope) ? rawScope.join(" ") : rawScope;
    const opts = {
      access_type,
      scope,
      prompt,
      response_type,
      client_id: this._clientID,
      redirect_uri: this._redirectURL
    };
    return `${GOOGLE_OAUTH2_AUTH_BASE_URL}?${stringify(opts)}`;
  }

  async exchangeAuthCodeForToken(authCode: string): Promise<GoogleTokenResponse> {
    const decodedAuthCode = decodeURIComponent(authCode);
    const data = {
      code: decodedAuthCode,
      client_id: this._clientID,
      client_secret: this._clientSecret,
      redirect_uri: this._redirectURL,
      grant_type: "authorization_code"
    };
    const res = await this.fetcher({
      url: GOOGLE_OAUTH2_TOKEN_URL,
      method: "POST",
      body: stringify(data),
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

  refreshAccessToken(): Promise<GoogleTokenResponse> {

    if (!this.hasValidRefreshToken())
      throw "No valid refresh token"

    const refreshToken = this.tokenStore.refresh_token

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
  ): Promise<GoogleTokenResponse> {
    const data = {
      refresh_token: refreshToken,
      client_id: this._clientID,
      client_secret: this._clientSecret,
      grant_type: "refresh_token"
    };
    const res = await this.fetcher({
      url: GOOGLE_OAUTH2_TOKEN_URL,
      method: "POST",
      body: stringify(data),
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

  private saveTokens(tokens: GoogleToken) {
    if (tokens?.expires_in) {
      tokens.expiry_date = new Date().getTime() + tokens.expires_in * 1000;
      delete tokens.expires_in;
    }
    this.tokenStore.save(tokens)
    this.emit("tokens", tokens);
  }


  async fetcher({url, ...rest}: any) {
    // this is replacing cowl lib
    const response = await fetch(url, rest)
    return {
      status: response.status,
      statusText: response.statusText,
      data: await response.json()
    }
  }

}

