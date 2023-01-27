/*
A "sleep" method implemented via setTimeout/sleep.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/*
An `isPromise` detector that gets the type of the promise return type correct, when returning `true`.
 */
export function isPromise<T = any>(obj: any):
  obj is T extends (...args: any[]) => any ? Promise<Awaited<T>> : never {
  return !!obj && typeof obj.then === 'function';
}
