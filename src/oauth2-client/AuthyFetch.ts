import {OAuth2Client} from "./index";
import {TokenStore} from './TokenStore'
import {InMemoryTokenStore} from "./TokenStore/InMemoryTokenStore";
import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";
import {exec} from "child_process";
import http, {IncomingMessage, ServerResponse} from "http";

export function makeAuthyFetch({
                                 clientId, clientSecret,
                                 tokenStore,
                                 scope,
                                 authBaseUrl, tokenUrl
                               }:
                                 {
                                   clientId: string,
                                   clientSecret: string,
                                   tokenStore?: TokenStore,
                                   scope: Array<string>,
                                   authBaseUrl: string,
                                   tokenUrl: string
                                 }) {


  const PORT = 9999

  const client = new OAuth2Client({
      clientId,
      clientSecret,
      tokenStore: tokenStore || new InMemoryTokenStore(),
      redirectUrl: `http://localhost:${PORT}/callback`,
      authBaseUrl,
      tokenUrl
    }
  );

  // Return a "fetch"-like function
  return async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
    // Refresh if necessary (the "auth-refresh")
    if (client.hasValidRefreshToken()
      && client.isTimeToRefresh())
      await client.refreshAccessToken()

    // ... or auth if necessary
    // TODO more scopes
    if (!client.bearerToken)
      await choreographNewLogin()

    // And now make the "fetch" call
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
      {access_type: 'offline', prompt: 'consent', scope: scope});

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

