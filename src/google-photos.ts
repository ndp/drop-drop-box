import fetch, {RequestInfo, RequestInit, Response} from 'node-fetch'
import {GoogleToken, OAuth2Client, TokenStore} from './google-oauth2-client/index';
import {exec} from 'child_process'
import http, {IncomingMessage, ServerResponse} from 'http'
import {InMemoryTokenStore} from "./google-oauth2-client/InMemoryTokenStore";


// was https://accounts.google.com/o/oauth2/auth
const SCOPE = [
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photoslibrary.appendonly'
]

const SETTINGS = {
  "installed": {
    "client_id": "721958700054-ecgdcgbgorr4e4tpmthj6dd8gfbgauj9.apps.googleusercontent.com",
    "project_id": "dropdropbox-1669873149217",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "redirect_uris": ["http://localhost"]
  }
}.installed

//TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token'

const tokenStore = new InMemoryTokenStore()


export function makeAutoRefreshFetch() {

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    "http://localhost:9999/callback",
    tokenStore
  );


  return async (url: RequestInfo, init?: RequestInit): Promise<Response> => {

    if (client.hasValidRefreshToken()
      && client.isTimeToRefresh())
      await client.refreshAccessToken()

    if (!client.bearerToken)
      await choreographNewLogin()

    init = {
      ...init,
      headers: {
        ...(init || {}).headers,
        'Authorization': `Bearer ${(client.bearerToken)}`
      }
    }
    return fetch(url, init)
  }

  async function choreographNewLogin() {

    const authURL = client.generateAuthUrl(
      {access_type: 'offline', prompt: 'consent', scope: SCOPE});

    console.log({authURL})
    exec(`open "${authURL}"`)

    return new Promise(resolve => {
      const server = http.createServer(requestListener).listen(9999);

      async function requestListener(req: IncomingMessage, res: ServerResponse) {

        server.emit('close')

        res.writeHead(200);
        res.end('<h1>Close your browser to proceed.</h1>');

        const url = new URL('http://localhost' + req.url)
        if (url.pathname !== '/callback') return

        const code = url.searchParams.get('code')
        console.log('searchParams: ', {code})

        const token = await client.exchangeAuthCodeForToken(code!)
        resolve(token)
      }
    })
  }
}


let myFetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;

export function setUpGoogleOAuth() {
  myFetch = makeAutoRefreshFetch();
}

export async function listAlbums(bearerToken: string) {
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

