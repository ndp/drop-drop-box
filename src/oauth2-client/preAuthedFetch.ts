import {OAuth2Client} from "./index";
import fetch, {RequestInfo, RequestInit, Response} from "node-fetch";
import {obtainBearerToken} from "./obtainBearerToken";


export function preAuthedFetch(client: OAuth2Client, scope: string) {
  // Return a "fetch"-like function
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


