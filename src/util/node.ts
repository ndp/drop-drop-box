import {inspect} from "node:util";

/*
Is the given promise still pending?
This is a bit of a "hack" and will work on node only.
@see https://stackoverflow.com/questions/30564053/how-can-i-synchronously-determine-a-javascript-promises-state
@see https://github.com/sindresorhus/p-state
 */
export function isNodePromisePending(promise: PromiseLike<any>): boolean {
  // console.log(inspect(promise))
  return !!inspect(promise).match(/pending/)
}
