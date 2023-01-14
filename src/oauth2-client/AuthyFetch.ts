import {OAuth2Client} from "./index";
import {TokenStore} from './TokenStore'
import {InMemoryTokenStore} from "./TokenStore/InMemoryTokenStore";
import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";
import {exec} from "child_process";
import http, {IncomingMessage, ServerResponse} from "http";

export async function obtainBearerToken(
  client: OAuth2Client,
  PORT: number,
  scope: Array<string> = [])
{
  // Refresh if necessary (the "auth-refresh")
  if (client.hasValidRefreshToken()
    && client.isTimeToRefresh())
    await client.refreshAccessToken()

  // ... or auth if necessary
  // TODO more scopes
  if (!client.bearerToken)
    await choreographTerminalLogin(client, {port: PORT, scope})
}


export function makeMiniNodeServerToReceiveCode(
  port: number,
  client: OAuth2Client) {
  return new Promise(resolve => {
    const server = http.createServer(requestListener).listen(port);

    async function requestListener(req: IncomingMessage, res: ServerResponse) {

      res.writeHead(200);
      res.end('<h1>Close your browser to proceed.</h1>');
      server.close()

      // req.url is really a path + params
      const url = new URL('http://example.com' + req.url)
      if (url.pathname !== '/callback') return

      const code = url.searchParams.get('code')
      // console.log('searchParams: ', {code})
      if (!code) throw Error('Did not receive a code in the callback.')

      const token = await client.exchangeAuthCodeForToken(code!)
      resolve(token)
    }
  });
}

async function choreographTerminalLogin(client: OAuth2Client, {
  scope,
  port
}: {
  scope: Array<string>,
  port: number
}) {

  const authURL = client.generateAuthUrl(
    {access_type: 'offline', prompt: 'consent', scope: scope});

  // console.log({authURL})
  // TODO... new window?
  exec(`open "${authURL}"`)

  return makeMiniNodeServerToReceiveCode(port, client)
}


export function makeAuthyFetch(client: OAuth2Client, PORT: number, scope: Array<string>) {
  // Return a "fetch"-like function
  return async (url: RequestInfo, init?: RequestInit): Promise<Response> => {

    await obtainBearerToken(client, PORT, scope);

    init = {
      ...init,
      headers: {
        ...(init || {}).headers,
        'Authorization': `Bearer ${(client.bearerToken)}`
      }
    }
    return fetch(url, init)
  }
}


