/*
Typescript version of a fetch with retry.

Here is a good version of this: https://github.com/jonbern/fetch-retry

Interesting simple retry examples:
https://www.chrisarmstrong.dev/posts/retry-timeout-and-cancel-with-fetch
 */

import {RequestInfo, RequestInit, Response} from "node-fetch";
import {makeRetryable} from "./makeRetryable";

// "standard" fetch
declare function fetch(
  url: RequestInfo,
  init?: RequestInit
): Promise<Response>;


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

export function makeFetchWithStatusRetry<F extends typeof fetch>(clientFetch: typeof fetch, opts: Options): typeof fetch {

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


/*
Handle FetchError
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
  type: 'system',
  errno: 'ETIMEDOUT',
  code: 'ETIMEDOUT'
}
*/
export function makeFetchWithTimeoutRetry<F extends typeof fetch>(clientFetch: typeof fetch): typeof fetch {
  return makeRetryable(clientFetch, {
    delay: 5000,
    retryable(count: number, e: any): boolean {
      return count < 4 && ['ETIMEDOUT', 'ENETDOWN'].includes(e.code)
    }
  })
}
