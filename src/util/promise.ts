/*
A "sleep" method implemented via setTimeout/sleep.
 */
export const sleep = (ms = 0): Promise<void> =>
  new Promise(r => setTimeout(r, ms));


/*
An `isPromise` detector that narrows the type of the promise return type,
when returning `true`.
 */
export function isPromise<T = any>(obj: any):
  obj is T extends { then: (...args: any[]) => any } ? Promise<Awaited<T>> : never {
  return (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function';
}
