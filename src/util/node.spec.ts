import sinon from "sinon";
import {isPending} from "./node"
import assert from "node:assert"



describe('isPending', () => {
  specify('resolved returns false', () => {
    assert.equal(false, isPending(Promise.resolve()))
  })
  specify('rejected returns false', () => {
    assert.equal(false, isPending(Promise.reject()))
  })
  specify('pending returns true', (done) => {
    const promise = new Promise(resolve => setTimeout(done, 100))
    assert.equal(true, isPending(promise))
  })
})

/*

ALSO :

  FETCHING /pictures/tanyaep/masters/2010/nov 1, 2010/img_3139.jpg
DropboxResponseError: Response failed with a 401 code
    at /Users/ndp/workspace/drop-drop-box/node_modules/dropbox/cjs/src/response.js:34:11
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async downloadFile (/Users/ndp/workspace/drop-drop-box/src/dropbox_api.ts:81:20)
    at async transfer (/Users/ndp/workspace/drop-drop-box/src/index.ts:187:30)
    at async Command.<anonymous> (/Users/ndp/workspace/drop-drop-box/src/index.ts:225:34) {
  status: 401,
  headers: Headers {
    [Symbol(map)]: [Object: null prototype] {
      'cache-control': [Array],
      'content-security-policy': [Array],
      'www-authenticate': [Array],
      'x-content-type-options': [Array],
      'content-type': [Array],
      'accept-encoding': [Array],
      date: [Array],
      server: [Array],
      'content-length': [Array],
      'strict-transport-security': [Array],
      'x-robots-tag': [Array],
      'x-dropbox-response-origin': [Array],
      'x-dropbox-request-id': [Array],
      connection: [Array]
    }
  },
  error: {
    error_summary: 'expired_access_token/.',
    error: { '.tag': 'expired_access_token' }
  }
}



 */

