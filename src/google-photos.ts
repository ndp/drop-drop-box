import { OAuth2Client } from "@buttercup/google-oauth2-client";
import { exec } from 'child_process'
import http, { IncomingMessage, ServerResponse } from 'http'


// was https://accounts.google.com/o/oauth2/auth
const SCOPE = 'https://www.googleapis.com/auth/photoslibrary.readonly'

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


const sessionState = Math.random().toString()

export async function auth () {

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    "http://localhost:9999/callback"
  );

  const authURL = client.generateAuthUrl(
    { access_type: 'offline', prompt: 'consent', scope: SCOPE });
  exec(`open "${authURL}"`)

  const promise = new Promise(resolve => {
    http.createServer(requestListener).listen(9999);


    async function requestListener (req: IncomingMessage, res: ServerResponse) {
      res.writeHead(200);
      res.end('Close your browser to proceed.');

      const url = new URL('http://localhost' + req.url)
      if (url.pathname !== '/callback') return

      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      console.log('searchParams: ', { code, state })

      if (state !== sessionState) console.error('Invalid state!')

      const token = await client.exchangeAuthCodeForToken(code!)
      console.log({ token })
      resolve(token)

    }



  })

  const bearerToken = await promise
  console.log(JSON.stringify(bearerToken))
  return bearerToken
}
