import fetch, {RequestInfo, RequestInit, Response} from 'node-fetch'
import {OAuth2Client, TokenStore} from './google-oauth2-client';
import {exec} from 'child_process'
import http, {IncomingMessage, ServerResponse} from 'http'
import {InMemoryTokenStore} from "./google-oauth2-client/InMemoryTokenStore";
import ReadableStream = NodeJS.ReadableStream;


// was https://accounts.google.com/o/oauth2/auth
const SCOPE = [
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photoslibrary.appendonly'
]

// const GOOGLE_PHOTOS_ALBUM_NAME = 'Imported from Dropbox'
const GOOGLE_PHOTOS_ALBUM_ID = 'AIeID-riC2_qP0DgMlCcZrt6jDL8_05BaWyr2_Sj9w_24YbQlwtLdAh_KdJUZ_1vQpCvCxAFFwkb'

//TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token'


export function makeAutoRefreshFetch({
                                       clientId, clientSecret, tokenStore
                                     }:
                                       {
                                         clientId: string,
                                         clientSecret: string,
                                         tokenStore?: TokenStore
                                       }) {

  const PORT = 9999
  const client = new OAuth2Client(
    clientId,
    clientSecret,
    `http://localhost:${PORT}/callback`,
    tokenStore || new InMemoryTokenStore()
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

    // console.log({authURL})
    exec(`open "${authURL}"`)

    return new Promise(resolve => {
      const server = http.createServer(requestListener).listen(PORT);

      async function requestListener(req: IncomingMessage, res: ServerResponse) {

        server.emit('close')

        res.writeHead(200);
        res.end('<h1>Close your browser to proceed.</h1>');

        const url = new URL('http://localhost' + req.url)
        if (url.pathname !== '/callback') return

        const code = url.searchParams.get('code')
        // console.log('searchParams: ', {code})

        const token = await client.exchangeAuthCodeForToken(code!)
        resolve(token)
      }
    })
  }
}


let myFetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;

export function setUpGoogleOAuth(
  options: { clientId: string, clientSecret: string, tokenStore?: TokenStore }) {
  myFetch = makeAutoRefreshFetch(options);
}

export async function listAlbums() {
  const response = await myFetch(
    'https://photoslibrary.googleapis.com/v1/albums')
  return await response.json()
}

export async function listMediaItems() {
  return myFetch('https://photoslibrary.googleapis.com/v1/mediaItems')
    .then(response => response.json())
}

export type MimeType = 'image/jpeg' | 'image/png' | 'image/gif'
type UploadToken = string

export async function uploadMedia(
  {
    stream,
    mimeType
  }: { stream: ReadableStream, mimeType: MimeType }
): Promise<UploadToken> {
  return myFetch('https://photoslibrary.googleapis.com/v1/uploads', {
    method: 'POST',
    body: stream,
    headers: {
      'Content-type': 'application/octet-stream',
      'X-Goog-Upload-Content-Type': mimeType,
      'X-Goog-Upload-Protocol': 'raw'
    }
  }).then(response => response.body.toString())
}


type MediaCreationResponse = {
  "newMediaItemResults": Array<{
    uploadToken: string,
    status: {
      message: 'Success' | 'Internal error',
      code?: number
    }
    mediaItem: {
      id: string,
      description: string,
      productUrl: string
      mimeType: MimeType,
      "mediaMetadata": {
        "width": string,
        "height": string,
        "creationTime": string,
        "photo": {}
      },
      "filename": string
    }
  }>
}


export async function createMediaItem(
  {description, fileName, uploadToken}:
    {
      description: string,
      fileName: string,
      uploadToken: UploadToken
    }
) {
  return myFetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
    headers: {'Content-type': 'application/json'},
    body: JSON.stringify({
      "albumId": GOOGLE_PHOTOS_ALBUM_ID,
      "newMediaItems": [
        {
          "description": description,
          "simpleMediaItem": {
            "fileName": fileName,
            "uploadToken": uploadToken
          }
        }

      ]
    })
  }).then(response => response.json() as Promise<MediaCreationResponse>)
}
