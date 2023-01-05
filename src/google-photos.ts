import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch'
import {GoogleToken, OAuth2Client, TokenStore} from './google-oauth2-client/index';
import { exec } from 'child_process'
import http, { IncomingMessage, ServerResponse } from 'http'


// was https://accounts.google.com/o/oauth2/auth
const SCOPE = [
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photoslibrary.appendonly'
]

const SETTINGS = {
  "installed": {
    "client_id":                   "721958700054-ecgdcgbgorr4e4tpmthj6dd8gfbgauj9.apps.googleusercontent.com",
    "project_id":                  "dropdropbox-1669873149217",
    "auth_uri":                    "https://accounts.google.com/o/oauth2/auth",
    "token_uri":                   "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "redirect_uris":               ["http://localhost"]
  }
}.installed

//TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token'


class InMemoryTokenStore implements TokenStore  {

  _tokens: GoogleToken|null = null

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

const tokenStore = new InMemoryTokenStore()


const sessionState = Math.random().toString()
let myFetch: ReturnType<typeof makeFetch>;

export async function authGooglePhotos () {

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    "http://localhost:9999/callback",
    tokenStore
  );

  const authURL = client.generateAuthUrl(
    { access_type: 'offline', prompt: 'consent', scope: SCOPE });
  exec(`open "${authURL}"`)

  const promise = new Promise(resolve => {
    http.createServer(requestListener).listen(9999);


    async function requestListener (req: IncomingMessage, res: ServerResponse) {
      res.writeHead(200);
      res.end('<h1>Close your browser to proceed.</h1>');

      const url = new URL('http://localhost' + req.url)
      if (url.pathname !== '/callback') return

      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      console.log('searchParams: ', { code, state })

      if (state !== sessionState) console.error('Invalid state!')

      const token = await client.exchangeAuthCodeForToken(code!)
      myFetch = makeFetch(client)
      console.log({ token })
      resolve(token)

    }


  })

  const bearerToken = await promise
  console.log(JSON.stringify(bearerToken))
  return bearerToken
}


function makeFetch (client: OAuth2Client) {
  return (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    const bearerToken = client.tokenStore.access_token
    init = {
      ...init,
      headers: {
        ...(init || {}).headers,
        'Authorization': `Bearer ${bearerToken}`
      }
    }
    return fetch(url, init)
  }
}

export async function listAlbums (bearerToken: string) {
  const response = await myFetch(
    'https://photoslibrary.googleapis.com/v1/albums')
  return await response.json()
}

export async function listMediaItems() {
  return myFetch('https://photoslibrary.googleapis.com/v1/mediaItems')
    .then(response => response.json())
}

const GOOGLE_PHOTOS_ALBUM_NAME = 'Imported from Dropbox'
const GOOGLE_PHOTOS_ALBUM_ID = 'AIeID-riC2_qP0DgMlCcZrt6jDL8_05BaWyr2_Sj9w_24YbQlwtLdAh_KdJUZ_1vQpCvCxAFFwkb'

