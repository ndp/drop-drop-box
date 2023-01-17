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
  if (client.hasValidRefreshToken()
    && client.isTimeToRefresh())
    await client.refreshAccessToken()

  // ... or auth if necessary
  // TODO more scopes
  if (!client.bearerToken)
    await choreographTerminalLogin(client, {scope})
  else if (verbose)
    console.log('Already logged in.')

  return client.bearerToken
}
