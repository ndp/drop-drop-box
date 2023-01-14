import {RequestInfo, RequestInit, Response} from 'node-fetch'
import {TokenStore} from './oauth2-client/TokenStore';
import ReadableStream = NodeJS.ReadableStream;
import { makeAuthyFetch} from "./oauth2-client/AuthyFetch";
import {GOOGLE_OAUTH2_AUTH_BASE_URL, GOOGLE_OAUTH2_TOKEN_URL} from "./oauth2-client/Google";
import {OAuth2Client} from "./oauth2-client";
import {InMemoryTokenStore} from "./oauth2-client/TokenStore/InMemoryTokenStore";


// was https://accounts.google.com/o/oauth2/auth
const SCOPE = [
  'https://www.googleapis.com/auth/photoslibrary',
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photoslibrary.appendonly'
]
// const GOOGLE_PHOTOS_ALBUM_NAME = 'Imported from Dropbox'
const GOOGLE_PHOTOS_ALBUM_ID = 'AIeID-riC2_qP0DgMlCcZrt6jDL8_05BaWyr2_Sj9w_24YbQlwtLdAh_KdJUZ_1vQpCvCxAFFwkb'

//TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token'


let authyFetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;

export function setUpGoogleOAuth(
  options: { clientId: string, clientSecret: string, tokenStore?: TokenStore }) {

  const PORT = 9999
  const redirectUrl = `http://localhost:${PORT}/callback`

  const client = new OAuth2Client({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      tokenStore: options.tokenStore || new InMemoryTokenStore(),
      redirectUrl: redirectUrl,
      authBaseUrl: GOOGLE_OAUTH2_AUTH_BASE_URL,
      tokenUrl: GOOGLE_OAUTH2_TOKEN_URL
    }
  );

  authyFetch = makeAuthyFetch(client, PORT, SCOPE);

}

export async function listAlbums() {
  const response = await authyFetch(
    'https://photoslibrary.googleapis.com/v1/albums')
  return await response.json()
}

export async function listMediaItems() {
  return authyFetch('https://photoslibrary.googleapis.com/v1/mediaItems')
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
  return authyFetch('https://photoslibrary.googleapis.com/v1/uploads', {
    method: 'POST',
    body: stream,
    headers: {
      'Content-type': 'application/octet-stream',
      'X-Goog-Upload-Content-Type': mimeType,
      'X-Goog-Upload-Protocol': 'raw'
    }
  }).then(response => response.text())
}


type MediaCreationResponse = {
  "error"?: {
    code: number,
    message: string,
    status: string
  },
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
  return authyFetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
    headers: {'Content-type': 'application/json'},
    method: 'POST',
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
  }).then(response => {
    // console.log({response})
    // if (response.status >= 200 && response.status < 300)
    return response.json() as Promise<MediaCreationResponse>;
    // else
    //   throw `${response.status} ${response.statusText}`
  })
}
