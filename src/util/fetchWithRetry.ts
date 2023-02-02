/*
Typescript version of a fetch with retry.

https://github.com/jonbern/fetch-retry
 */

import {RequestInfo, RequestInit, Response} from "node-fetch";
import {makeRetryable} from "./makeRetryable";


declare function fetch(
  url: RequestInfo,
  init?: RequestInit
): Promise<Response>;

type FetchFn = typeof fetch

/**
 * retries:              Maximum number of retries to use
 * retryableStatusCodes: Status codes to retry.
 *                       If none give, it will not retry all error responses.
 * retryDelay:           Milliseconds to wait before a retry, or
 *                       a function that returns msecs to wait
 */
type Options = {
  retries?: number,
  retryableStatusCodes: Array<number>,
  retryDelay?: number | ((nextRetryIndex: number, exception: any, response: Response) => number)
}

class RetryableError extends Error {
  constructor(readonly response: Response) {
    super('retryable')
  }
}

export function makeFetchWithRetry(clientFetch: FetchFn, opts: Options): FetchFn {

  return makeRetryable((url: RequestInfo, init?: RequestInit) => {

    return clientFetch(url, init)
      .then(res => {
        if (isRetryableStatusCode(res.status)) {
          return Promise.reject(new RetryableError(res))
        }
        return res
      }) as Promise<Response>
  }, {
    delay,
    retryable: (count: number, exception: any) =>
      count <= (opts.retries ?? 3)
      && exception.message === 'retryable'
  })


  function isRetryableStatusCode(status: number) {
    return (opts.retryableStatusCodes ?? [status]).includes(status);
  }

  function delay(count: number, e: any) {
    return typeof opts.retryDelay == 'number'
      ? opts.retryDelay
      : typeof opts.retryDelay === 'function'
        ? opts.retryDelay(count, e, e.response)
        : 1000;
  }

}

