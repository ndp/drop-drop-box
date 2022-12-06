import fetch from 'node-fetch'
import { stringify } from "query-string";
import EventEmitter from "eventemitter3";
import {
  ERR_REFRESH_FAILED,
  GOOGLE_OAUTH2_AUTH_BASE_URL,
  GOOGLE_OAUTH2_TOKEN_URL
} from "./symbols.js";
import {
  GoogleToken
} from "./types.js";


export interface GoogleTokenResponse {
  res: any;
  tokens: GoogleToken;
}

export class OAuth2Client extends EventEmitter {
  protected _accessToken: string|null;
  protected _refreshToken: string|null;
  protected _refreshTokenPromises: Map<string, Promise<GoogleTokenResponse>> = new Map();

  constructor (protected _clientID: string,
               protected _clientSecret: string,
               protected _redirectURL: string) {
    super();
    this._accessToken = null;
    this._refreshToken = null;
  }

  get accessToken () {
    return this._accessToken;
  }

  get refreshToken () {
    return this._refreshToken;
  }

  async _request ({ url, ...rest }: any) {
    // this is replacing cowl lib
    const response = await fetch(url, rest)
    return {
      status: response.status,
      statusText: response.statusText,
      data: await response.json()
    }
  }

  generateAuthUrl (config: {
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
      client_id:    this._clientID,
      redirect_uri: this._redirectURL
    };
    return `${GOOGLE_OAUTH2_AUTH_BASE_URL}?${stringify(opts)}`;
  }

  async exchangeAuthCodeForToken (authCode: string): Promise<GoogleTokenResponse> {
    const decodedAuthCode = decodeURIComponent(authCode);
    const data = {
      code:          decodedAuthCode,
      client_id:     this._clientID,
      client_secret: this._clientSecret,
      redirect_uri:  this._redirectURL,
      grant_type:    "authorization_code"
    };
    const res = await this._request({
                                      url:     GOOGLE_OAUTH2_TOKEN_URL,
                                      method:  "POST",
                                      body:    stringify(data),
                                      headers: {
                                        "Content-Type": "application/x-www-form-urlencoded"
                                      }
                                    });
    const { data: tokens } = res;
    this.saveTokens(tokens)
    return {
      tokens,
      res
    };
  }

  refreshAccessToken (refreshToken?: string): Promise<GoogleTokenResponse> {
    if (!refreshToken) {
      return this.refreshAccessTokenNoCache(refreshToken);
    }
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

  async refreshAccessTokenNoCache (
    refreshToken?: string
  ): Promise<GoogleTokenResponse> {
    const data = {
      refresh_token: refreshToken,
      client_id:     this._clientID,
      client_secret: this._clientSecret,
      grant_type:    "refresh_token"
    };
    const res = await this._request({
                                      url:            GOOGLE_OAUTH2_TOKEN_URL,
                                      method:         "POST",
                                      body:           stringify(data),
                                      headers:        {
                                        "Content-Type": "application/x-www-form-urlencoded"
                                      },
                                      validateStatus: () => true
                                    });
    const { data: tokens, status, statusText } = res;
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

  private saveTokens (tokens: GoogleToken) {
    if (tokens && tokens.expires_in) {
      tokens.expiry_date = new Date().getTime() + tokens.expires_in * 1000;
      delete tokens.expires_in;
    }
    this._accessToken = tokens.access_token;
    this._refreshToken = tokens.refresh_token;
    this.emit("tokens", tokens);
  }
}
