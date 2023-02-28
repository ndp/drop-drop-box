import sinon from "sinon";
import assert from "node:assert";
import {makeFetchWithRetry} from "./fetchWithRetry";


describe('makeFetchWithStatusRetry', () => {

  specify('happy path with no retry', async () => {
    const clientFetch = sinon.stub()
    clientFetch.onFirstCall()
      .returns(Promise.resolve({
        status: 200, json: () => Promise.resolve('made it')
      }))

    const fetchWithRetry = makeFetchWithRetry(clientFetch, {
      retryableStatusCodes: [409]
    })

    const response = await fetchWithRetry('/foo')
    const json = await response.json()

    assert.equal('made it', json)
  })

  specify('fetch returns non-retryable status code', async () => {
    const clientFetch = sinon.stub()
    clientFetch
      .returns(Promise.resolve({
        status: 404
      }))

    const fetchWithRetry = makeFetchWithRetry(clientFetch, {
      retryableStatusCodes: [409],
      retries: 2,
      retryDelay: 20
    })

    const response = await fetchWithRetry('/foo')
    assert.equal(404, response.status)
  })

  specify('one retry', async () => {
    const clientFetch = sinon.stub()
    clientFetch.onFirstCall()
      .returns(Promise.resolve({
        status: 409
      }))
    clientFetch.onSecondCall()
      .returns(Promise.resolve({
        status: 200, json: () => Promise.resolve('made it')
      }))

    const fetchWithRetry = makeFetchWithRetry(clientFetch, {
      retryableStatusCodes: [409],
      retryDelay: 20
    })

    const response = await fetchWithRetry('/foo')
    const json = await response.json()
    assert.equal('made it', json)
  })

  specify('exhausts retries',  (done) => {
    const clientFetch = sinon.stub()
    clientFetch.onFirstCall()
      .returns(Promise.resolve({
        status: 409
      }))
    clientFetch.onSecondCall()
      .returns(Promise.resolve({
        status: 409
      }))
    clientFetch.onThirdCall()
      .returns(Promise.resolve({
        status: 409
      }))

    const fetchWithRetry = makeFetchWithRetry(clientFetch, {
      retryableStatusCodes: [409],
      retries: 2,
      retryDelay: 20
    })

    const response = fetchWithRetry('/foo')
    response.then((response) => {
      assert.fail('should have failed after exhausting time-outs')
    }, (e) => {
      assert.equal(409, e.response.status)
      done()
    })
  })

})
