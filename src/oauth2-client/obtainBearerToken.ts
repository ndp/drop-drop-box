import {OAuth2Client} from "./OAuth2Client";
import {choreographTerminalLogin} from "./terminal";

type Options = {
  client: OAuth2Client,
  scope: string,
  verbose?: boolean
}

export async function obtainBearerToken({
                                          client,
                                          scope,
                                          verbose = false
                                        }: Options) {
  // Refresh if necessary (the "auth-refresh")
  if (client.hasRefreshToken()
    && client.isAccessTokenExpired()) {
    console.log('  Refreshing access token.')
    await client.refreshAccessToken()
  }

  // ... or auth if necessary
  // TODO more scopes
  if (client.isAccessTokenExpired())
    await choreographTerminalLogin(client, {scope})
  else if (verbose)
    console.log('  Using existing login.')

  return client.bearerToken
}
