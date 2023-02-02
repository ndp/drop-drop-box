import sinon from "sinon";
import {expect, util} from "chai";
import * as FakeTimers from '@sinonjs/fake-timers'
import assert from "node:assert";
import fetch from 'node-fetch'
import {makeFetchWithRetry} from "./fetchWithRetry";
import {fail} from "assert";


describe('makeFetchWithRetry', () => {

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

    expect(json).to.equal('made it')
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
    expect(response.status).to.equal(404)
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
    expect(json).to.equal('made it')
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
      fail('should have failed after exhausting time-outs')
    }, (e) => {
      expect(e.response.status).to.equal(409)
      done()
    })
  })

})
