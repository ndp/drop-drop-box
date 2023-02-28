import {isPromise,sleep} from "./promise";
/*
Retries are evaluated based on which retry it is (starting at 1),
and, if you want, the exception that was thrown.
 */
type ShouldRetryParams<E = unknown> = [count: number, exceptionThrown: E]

interface MakeRetryableOptions<E = unknown> {
  shouldRetry: (...args: ShouldRetryParams<E>) => boolean | Promise<boolean>,
  delay?: number | ((...args: ShouldRetryParams<E>) => number)
}

/**
 * Given a function, returns a new function with built-in retry capabilities.
 * Failure for sync functions means throwing an exception, and
 * failure for Promise/async functions means returning a rejected promise.
 *
 * The retry capabilities are controlled by the options provided:
 *
 * -  `shouldRetry` is a function you provide that determines whether a
 *    failure will retry. It receives the retry count (starting at 1), and
 *    the exception that was thrown/rejected, and should returns true or false.
 *    Although it's possible to retry "forever" (pass `() => true`), a better
 *    choice might be some sort of retry limit such as `(c) => c < 5`, or
 *    based on a specific exception, such as `(c,e) => e.status === 503`.
 *
 *    Although this function is basically function asking for true/false,
 *    it is possible to execute other logic, including side effects.
 *    This could be any sort of "extra" logic to prepare for a retry.
 *
 * -  `delay` is how long to wait before retrying. By default there is no delay,
 *    but you can provide a number (of milliseconds), or a function, which
 *    could implement exponential backoff ala `(c) => Math.pow(2, c) * 1000`
 *    or some other mechanism.
 */
export function makeRetryable<
  This,
  Args extends Array<unknown>,
  RetType = void,
  Except = unknown
>(
  targetFn: (this: This, ...args: Args) => RetType,
  options: MakeRetryableOptions<Except>
): (...args: Args) => RetType {

  // Return a new function with the same signature...
  return function (this: This, ...args: Args): RetType {

    // Start counting retries for this call
    let retryCount = 0

    const callTheTargetFn = (): RetType => {

      try {
        const result = targetFn.call(this, ...args);
        if (isPromise(result)) {
          return result.catch((e) => onException(e, true)) as RetType
        } else {
          if (options.delay) throw '`delay` is not supported for sync functions'
          return result  // happy path, no async
        }
      } catch (e) {
        return onException(e as Except, false) as RetType
      }

      function onException(e: Except, itsAPromise: boolean) {

        retryCount++

        const retry = options.shouldRetry(retryCount, e);

        if (isPromise(retry)) {
          return retry.then((r => {
            return retryIf(r);
          }))
        } else {
          return retryIf(retry);
        }

        function retryIf(isRetryable: boolean) {
          if (isRetryable)
            if (itsAPromise) {
              const delay = typeof options.delay === 'function'
                ? options.delay(retryCount, e)
                : (options.delay || 0)
              return sleep(delay).then(callTheTargetFn);
            } else
              return callTheTargetFn()
          else
            throw e // Rethrow the original exception
        }
      }
    };

    return callTheTargetFn()
  }
}

