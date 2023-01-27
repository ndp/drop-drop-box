import {inspect} from "node:util";

/*
Is the given promise still pending?
This is a bit of a "hack" and will work on node only.
 */
export function isPending(promise: PromiseLike<any>): boolean {
  // console.log(inspect(promise))
  return !!inspect(promise).match(/pending/)
}
