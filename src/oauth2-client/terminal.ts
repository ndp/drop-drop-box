import {OAuth2Client} from "./OAuth2Client";
import http, {IncomingMessage, ServerResponse} from "http";
import {exec} from "child_process";

export function makeMiniNodeServerToReceiveCode(
  client: OAuth2Client) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(requestListener)

    server.listen(client.redirectPort);

    async function requestListener(req: IncomingMessage, res: ServerResponse) {

      // req.url is really a path + params, so we mock in example.com
      const url = new URL('http://example.com' + req.url)

      // we receive requests for things other than the correct page.
      if (url.pathname !== client.redirectPath) {
        res.statusCode = 404
        res.end()
        return
      }

      // We have a good request! (we think)

      res.writeHead(200);
      res.end('<h1>Close your browser to proceed.</h1>');
      server.close()

      const code = url.searchParams.get('code')
      if (!code)
        reject('Did not receive a code in the callback: ' + req.url)
      else
        resolve(await client.exchangeAuthCodeForToken(code))
    }
  });
}

export async function choreographTerminalLogin(client: OAuth2Client, {
  scope
}: {
  scope: string
}) {

  const authURL = client.generateAuthUrl(
    {scope: scope});

  // console.log({authURL})
  // TODO... new window?
  exec(`open "${authURL}"`)

  return makeMiniNodeServerToReceiveCode(client)
}
