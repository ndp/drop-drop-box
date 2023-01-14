import {OAuth2Client} from "./index";
import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";
import {choreographTerminalLogin} from "./terminal";

export async function obtainBearerToken(
  client: OAuth2Client,
  scope: string)
{
  // Refresh if necessary (the "auth-refresh")
  if (client.hasValidRefreshToken()
    && client.isTimeToRefresh())
    await client.refreshAccessToken()

  // ... or auth if necessary
  // TODO more scopes
  if (!client.bearerToken)
    await choreographTerminalLogin(client, {scope})

  return client.bearerToken
}


export function makeAuthyFetch(client: OAuth2Client, scope: string) {
  // Return a "fetch"-like function
  return async (url: RequestInfo, init?: RequestInit): Promise<Response> => {

    await obtainBearerToken(client, scope);

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


