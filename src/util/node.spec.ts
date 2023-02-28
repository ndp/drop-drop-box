import sinon from "sinon";
import {isNodePromisePending} from "./node"
import assert from "node:assert"



describe('isNodePromisePending', () => {
  specify('resolved returns false', () => {
    assert.equal(false, isNodePromisePending(Promise.resolve()))
  })
  specify('rejected returns false', () => {
    assert.equal(false, isNodePromisePending(Promise.reject()))
  })
  specify('pending returns true', (done) => {
    const promise = new Promise(resolve => setTimeout(done, 100))
    assert.equal(true, isNodePromisePending(promise))
  })
})
