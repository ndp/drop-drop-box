/*
Typescript version of a fetch with retry.

Here is a good version of this: https://github.com/jonbern/fetch-retry

Interesting simple retry examples:
https://www.chrisarmstrong.dev/posts/retry-timeout-and-cancel-with-fetch
 */

import {RequestInfo, RequestInit, Response} from "node-fetch";
import {makeRetryable} from "./makeRetryable";


export const RetryableStatusCodesDefault = [
  408, // timeout
  409, // conflict
  429, // too many requests
  500, // internal server error,
  502, // Bad Gateway,
  503, // Service Unavailable,
  504, // Gateway Timeout,
  599, // Network Connect Timeout Error.
]


// "standard" fetch
declare function fetch(
  url: RequestInfo,
  init?: RequestInit
): Promise<Response>;


/**
 * retries:              Maximum number of retries to use
 * retryableStatusCodes: Status codes to retry.
 *                       If none give, it will retry a predefined
 *                       set of status codes, `RetryableStatusCodesDefault`.
 *                       To not retry any status codes, pass `[]`.
 * retryDelay:           Milliseconds to wait before a retry, or
 *                       a function that returns msecs to wait
 */
type Options = {
  retries?: number,
  retryableStatusCodes?: Array<number>,
  retryDelay?: number | ((nextRetryIndex: number, exception: any, response: Response) => number)
}

class RetryableError extends Error {
  constructor(readonly response: Response | null, readonly exception?: any) {
    super('retryable')
  }
}

export function makeFetchWithRetry<F extends typeof fetch>(clientFetch: typeof fetch, opts: Options): typeof fetch {

  return makeRetryable((url: RequestInfo, init?: RequestInit) => {

    return clientFetch(url, init)
      .then(res => {
        if (isRetryableStatusCode(res.status)) {
          return Promise.reject(new RetryableError(res))
        }
        return res
      }, (e: any) => {
        if (isNetworkError(e))
          return Promise.reject(new RetryableError(null, e))
      }) as Promise<Response>
  }, {
    delay,
    retryable: (count: number, exception: any) =>
      count <= (opts.retries ?? 3)
      && exception.message === 'retryable'
  })


  function isRetryableStatusCode(status: number) {
    return (opts.retryableStatusCodes ?? RetryableStatusCodesDefault).includes(status);
  }

  function delay(count: number, e: any) {
    return typeof opts.retryDelay == 'number'
      ? opts.retryDelay
      : typeof opts.retryDelay === 'function'
        ? opts.retryDelay(count, e, e.response)
        : 1000;
  }

}

export function isNetworkError(e: any) {
  return e && ['ETIMEDOUT', 'ENETDOWN', 'EPIPE'].includes(e.code)
}
