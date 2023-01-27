import {isPromise, sleep} from "./promise";

interface MakeRetryableOptions {
  retryable: (count: number, exception: any) => boolean,
  delay?: number | ((count: number, exception: any) => number)
}

/**
 * Given a function, returns a function with built-in retry capabilities.
 * Failure for normal functions means throwing an exception, and failure
 * for Promise/async functions means returning a rejected promise.
 *
 *
 * The retry capabilities are controlled by the options provided:
 *
 * -  `retryable` is a function you provide that determines whether a specific
 *    failure will retry. It receives the retry count (starting at 1), and
 *    the exception that was thrown/rejected, and returns true or false.
 *    Although it's possible to retry "forever" (pass `() => true`), a better
 *    choice might be some sort of retry limit such as `(c) => c < 5`, or
 *    based on a specific exception, such as `(c,e) => e.status === 503`.
 *
 * -  `delay` is how long to wait before retrying. By default this is no delay,
 *    but you can provide a number (of milliseconds), or a function, which
 *    could implement exponential backoff ala `(c) => Math.pow(2, c) * 1000`
 *    or some other mechanism.
 */
export function makeRetryable<A extends Array<unknown>, R = void>(targetFn: (...args: A) => R, options: MakeRetryableOptions): (...args: A) => R {

  let retryCount = 0

  return function (...args: A): R {

    return callTargetFn()

    function maybeRetry(e: any, itsAPromise: boolean) {
      retryCount++
      if (options.retryable(retryCount, e))
        if (itsAPromise) {
          const delay = typeof options.delay === 'function'
            ? options.delay(retryCount, e)
            : (options.delay || 0)
          return sleep(delay).then(callTargetFn);
        } else
          return callTargetFn()
      else
        throw e
    }

    function callTargetFn(): R {
      try {
        const result = targetFn(...args);
        if (isPromise(result)) {
          return result.catch((e) => maybeRetry(e, true)) as R
        } else {
          if (options.delay) throw '`delay` is not supported for synchronous functions'
          return result  // happy path, no async
        }
      } catch (e) {
        return maybeRetry(e, false) as R
      }
    }
  }
}

