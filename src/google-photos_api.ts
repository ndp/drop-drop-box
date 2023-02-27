import {RequestInfo, RequestInit, Response} from 'node-fetch'
import {TokenStore} from './oauth2-client/TokenStore';
import {preAuthedFetch} from "./oauth2-client/preAuthedFetch";
import {OAuth2Client} from "./oauth2-client";
import {InMemoryTokenStore} from "./oauth2-client/TokenStore/InMemoryTokenStore";
import {ProviderUrlsSupported} from "./oauth2-client/ProviderUrlsSupported";
import ReadableStream = NodeJS.ReadableStream;
import {obtainBearerToken} from "./oauth2-client/obtainBearerToken";
import {MimeType} from "./util/mime-type";
import {makeFetchWithRetry} from "./util/fetchWithRetry";


// was https://accounts.google.com/o/oauth2/auth
const SCOPE = [
  // 'https://www.googleapis.com/auth/photoslibrary',
  // 'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/photoslibrary.appendonly',
  'https://www.googleapis.com/auth/photoslibrary.sharing',
  'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata'
].join(' ')

//TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token'


let authyFetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;
let authyFetchWithRetry: (url: RequestInfo, init?: RequestInit) => Promise<Response>;

export async function oauthGoogle(
  options: { clientId: string, clientSecret: string, tokenStore?: TokenStore }) {

  const client = new OAuth2Client({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      redirectUrl: `http://localhost:9999/callback`,
      tokenStore: options.tokenStore || new InMemoryTokenStore(),
      providerUrls: ProviderUrlsSupported.Google,
    }
  );

  await obtainBearerToken({client, scope: SCOPE, verbose: true});

  // `authyFetch` is a global
  authyFetch = await preAuthedFetch(client, SCOPE);
  authyFetchWithRetry = makeFetchWithRetry(authyFetch, {
    retries: 5,
    retryDelay: 6000
  })
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

type UploadToken = string

export async function uploadMedia(
  {
    buffer,
    mimeType
  }: { buffer: Buffer, mimeType: MimeType }
): Promise<UploadToken> {
  return authyFetchWithRetry('https://photoslibrary.googleapis.com/v1/uploads', {
    method: 'POST',
    body: buffer,
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
        "photo": unknown
      },
      "filename": string
    }
  }>
}


export async function createMediaItem(
  {description, fileName, uploadToken, albumId}:
    {
      albumId: string
      description: string,
      fileName: string,
      uploadToken: UploadToken
    }
) {
  return authyFetchWithRetry('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
    headers: {'Content-type': 'application/json'},
    method: 'POST',
    body: JSON.stringify({
      "albumId": albumId,
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

// https://developers.google.com/photos/library/reference/rest/v1/albums/create
export async function createAlbum(title: string): Promise<string> {
  const res = await authyFetch('https://photoslibrary.googleapis.com/v1/albums', {
    headers: {'Content-type': 'application/json'},
    method: 'POST',
    body: JSON.stringify({
      "album": {
        "isWriteable": true,
        "title": title
      }
    })
  })
  const json = await res.json()
  return json.id
  /* Looks like:
  {
  "id": "AIeID-r-TMEhOjbgac9xmV5pYtFdTN6qFCdWcJCrKrKh71HP37H0gs-H46ciZ1uhZozC7WvQLcq9",
  "title": "Imported from Dropboxpodod",
  "productUrl": "https://photos.google.com/lr/album/AIeID-r-TMEhOjbgac9xmV5pYtFdTN6qFCdWcJCrKrKh71HP37H0gs-H46ciZ1uhZozC7WvQLcq9",
  "isWriteable": true
}
   */
}
