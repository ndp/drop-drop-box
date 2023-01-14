import {OAuth2Client} from "./OAuth2Client";
import http, {IncomingMessage, ServerResponse} from "http";
import {exec} from "child_process";

export function makeMiniNodeServerToReceiveCode(
  client: OAuth2Client) {
  return new Promise(resolve => {
    const server = http.createServer(requestListener).listen(client.redirectPort);

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

export async function choreographTerminalLogin(client: OAuth2Client, {
  scope
}: {
  scope: string
}) {

  const authURL = client.generateAuthUrl(
    {access_type: 'offline', prompt: 'consent', scope: scope});

  // console.log({authURL})
  // TODO... new window?
  exec(`open "${authURL}"`)

  return makeMiniNodeServerToReceiveCode(client)
}
