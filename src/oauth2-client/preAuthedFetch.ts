import {OAuth2Client} from "./index";
import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";
import {obtainBearerToken} from "./obtainBearerToken";


// Return a "fetch"-like function that obtains a bearer token first.
// Probably needs to be wrapped in a retry mechanism.
export function preAuthedFetch(client: OAuth2Client, scope: string) {
  return async (url: RequestInfo, init?: RequestInit): Promise<Response> => {

    await obtainBearerToken({client, scope});

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


