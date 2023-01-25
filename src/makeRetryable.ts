interface Options {
  retryable: (count: number, exception: any) => boolean,
}


export function makeRetryable<A extends Array<unknown>, R = void>(targetFn: (...args: A) => R, options: Options): (...args: A) => R {

  let retryCount = 0

  return function (...args: A): R {

    return callTargetFn()

    function maybeRetry(e: any) {
      retryCount++
      if (options.retryable(retryCount, e))
        return callTargetFn()
      else
        throw e
    }

    function callTargetFn(): R {
      try {
        const result = targetFn(...args);
        if (isPromise(result)) {
          return result.catch(maybeRetry) as R
        } else {
          return result  // happy path, no async
        }
      } catch (e) {
        return maybeRetry(e)
      }
    }
  }
}


function isPromise<T = any>(obj: any): obj is T extends (...args: any[]) => any ? Promise<Awaited<ReturnType<T>>> : never {
  return !!obj && typeof obj.then === 'function';
}
