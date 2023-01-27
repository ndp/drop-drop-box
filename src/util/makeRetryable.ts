import {sleep} from "./promise";

interface MakeRetryableOptions {
  retryable: (count: number, exception: any) => boolean,
  delay?: number | ((count: number, exception: any) => number)
}

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


function isPromise<T = any>(obj: any): obj is T extends (...args: any[]) => any ? Promise<Awaited<ReturnType<T>>> : never {
  return !!obj && typeof obj.then === 'function';
}
