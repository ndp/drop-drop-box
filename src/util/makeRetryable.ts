import {isPromise, sleep} from "./promise";

/*
Retries are evaluated basec on which retry it is (starting at 1),
and, if you want, the exception that was thrown.
 */
type MakeRetryableParams = [count: number, exceptionThrown: any]

interface MakeRetryableOptions {
  retryable: (...args: MakeRetryableParams) => boolean | Promise<boolean>,
  delay?: number | ((...args: MakeRetryableParams) => number)
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
 *    Although this function is basically function asking for true/false,
 *    it would be possible to execute other logic, including side effects.
 *    This could be any sort of logic to prepare for a retry.
 *
 * -  `delay` is how long to wait before retrying. By default this is no delay,
 *    but you can provide a number (of milliseconds), or a function, which
 *    could implement exponential backoff ala `(c) => Math.pow(2, c) * 1000`
 *    or some other mechanism.
 */
export function makeRetryable<Th, A extends Array<unknown>, R = void>(targetFn: (this: Th, ...args: A) => R, options: MakeRetryableOptions): (...args: A) => R {

  return function (this: Th, ...args: A): R {

    let retryCount = 0

    const callTargetFn = (): R => {

      try {
        const result = targetFn.call(this, ...args);
        if (isPromise(result)) {
          return result.catch((e) => maybeRetry(e, true)) as R
        } else {
          if (options.delay) throw '`delay` is not supported for synchronous functions'
          return result  // happy path, no async
        }
      } catch (e) {
        return maybeRetry(e, false) as R
      }

      function maybeRetry(e: any, itsAPromise: boolean) {
        retryCount++
        const isRetryable = options.retryable(retryCount, e);
        if (isPromise(isRetryable)) {
          return isRetryable.then((r => {
            return doRetry(r);
          }))
        } else {
          return doRetry(isRetryable);
        }

        function doRetry(isRetryable: boolean) {
          if (isRetryable)
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

      }

    };

    return callTargetFn()
  }
}

