import {expect, util} from "chai";
import sinon from "sinon";
import {isPending} from "./node";




describe('isPending', () => {
  specify('resolved returns false', () => {
    expect(isPending(Promise.resolve())).to.equal(false)
  })
  specify('rejected returns false', () => {
    expect(isPending(Promise.reject())).to.equal(false)
  })
  specify('pending returns true', (done) => {
    const promise = new Promise(resolve => setTimeout(done, 100))
    expect(isPending(promise)).to.equal(true)
  })
})

/*
/Users/ndp/workspace/drop-drop-box/node_modules/node-fetch/lib/index.js:1491
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
          ^
FetchError: request to https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate failed, reason: connect ETIMEDOUT 172.217.164.106:443
    at ClientRequest.<anonymous> (/Users/ndp/workspace/drop-drop-box/node_modules/node-fetch/lib/index.js:1491:11)
    at ClientRequest.emit (node:events:513:28)
    at ClientRequest.emit (node:domain:489:12)
    at TLSSocket.socketErrorListener (node:_http_client:490:9)
    at TLSSocket.emit (node:events:513:28)
    at TLSSocket.emit (node:domain:489:12)
    at emitErrorNT (node:internal/streams/destroy:151:8)
    at emitErrorCloseNT (node:internal/streams/destroy:116:3)
    at processTicksAndRejections (node:internal/process/task_queues:82:21) {
  type: 'system',
  errno: 'ETIMEDOUT',
  code: 'ETIMEDOUT'
}


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


/Users/ndp/workspace/drop-drop-box/node_modules/node-fetch/lib/index.js:1491
      reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
          ^
FetchError: request to https://photoslibrary.googleapis.com/v1/uploads failed, reason: write EPIPE
    at ClientRequest.<anonymous> (/Users/ndp/workspace/drop-drop-box/node_modules/node-fetch/lib/index.js:1491:11)
    at ClientRequest.emit (node:events:513:28)
    at ClientRequest.emit (node:domain:489:12)
    at TLSSocket.socketErrorListener (node:_http_client:490:9)
    at TLSSocket.emit (node:events:513:28)
    at TLSSocket.emit (node:domain:489:12)
    at emitErrorNT (node:internal/streams/destroy:151:8)
    at emitErrorCloseNT (node:internal/streams/destroy:116:3)
    at processTicksAndRejections (node:internal/process/task_queues:82:21) {
  type: 'system',
  errno: 'EPIPE',
  code: 'EPIPE'
}
DropboxResponseError: Response failed with a 401 code
    at /Users/ndp/workspace/drop-drop-box/node_modules/dropbox/cjs/src/response.js:34:11
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async markTransferredOnDropbox (/Users/ndp/workspace/drop-drop-box/src/dropbox_api.ts:105:20)
    at async transfer (/Users/ndp/workspace/drop-drop-box/src/index.ts:209:9)
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
      'x-dropbox-response-origin': [Array],
      'x-dropbox-request-id': [Array],
      connection: [Array]
    }
  },
  error: {
    error_summary: 'expired_access_token/...',
    error: { '.tag': 'expired_access_token' }
  }

 */

