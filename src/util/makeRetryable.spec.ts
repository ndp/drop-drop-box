import sinon from "sinon";
import {makeRetryable} from "./makeRetryable";
import {rejectNTimesThenResolve, throwNTimesThenReturn} from "./spec-helpers";
import assert from "node:assert";


describe('makeRetryable', () => {

  const options = {shouldRetry: (e: any) => false}
  const alwaysThrow = function () {
    throw 'an exception'
  }


  afterEach(() => {
    sinon.verifyAndRestore()
  })

  specify('returns original function result', () => {
    const wrapped = makeRetryable(() => 'foo', options)

    const result = wrapped()

    assert.equal('foo', result)
  })

  specify('original function receives wrapped function’s parameters', async () => {
    const spy = sinon.spy((a: number, b: string) => Promise.resolve('haha'))

    const wrapped = makeRetryable(spy, options)

    const result = await wrapped(1, 'a')

    assert.equal(true, spy.calledOnce)
    assert.equal(1, spy.getCall(0).firstArg)
    assert.equal('a', spy.getCall(0).args[1])
  })

  specify('does not call `shouldRetry` option if no error', () => {
    const wrapped = makeRetryable(() => 'foo', options)
    const spy = sinon.spy(options, 'shouldRetry')

    wrapped()

    assert.equal(0, spy.callCount)
  })

  specify('returns original async function promise result', async () => {
    const wrapped = makeRetryable(async () => 'foo', options)

    const result = await wrapped()

    assert.equal('foo', result)
  })

  specify('does not call `shouldRetry` option if promise resolves', async () => {
    const wrapped = makeRetryable(async () => 'foo', options)
    const spy = sinon.spy(options, 'shouldRetry')

    await wrapped()

    assert.equal(0, spy.callCount)
  })

  specify('preserves "this" on initial call', async () => {
    const api = {
      doItRemotely: (a: number) => Promise.resolve(a + 1)
    }
    const spy = sinon.spy(api, 'doItRemotely')

    api.doItRemotely = makeRetryable(api.doItRemotely, options)

    const result = await api.doItRemotely(4)

    assert.equal(result, 5)
    assert.equal(spy.getCall(0).thisValue, api)
  })

  specify('preserves "this" on retry', () => {
    const api = {
      alwaysThrow: alwaysThrow
    }
    const spy = sinon.spy(api, 'alwaysThrow')

    api.alwaysThrow = makeRetryable(
      api.alwaysThrow,
      {
        shouldRetry(count: number): boolean {
          return count < 3;
        }
      })

    try {
      api.alwaysThrow()
      assert.fail('should have throw exception')
    } catch (e) {
      assert.equal(spy.callCount, 3)
      assert.equal(spy.getCall(0).thisValue, api)
      assert.equal(spy.getCall(1).thisValue, api)
      assert.equal(spy.getCall(2).thisValue, api)
    }

  })

  specify('throwing an exception calls `shouldRetry`', () => {
    const retryableSpy = sinon.spy(options, 'shouldRetry')
    const wrapped = makeRetryable(alwaysThrow, options)

    try {
      wrapped()
      assert.fail('should have throw exception')
    } catch (e) {
      assert.equal(1, retryableSpy.callCount)
    }
  })

  specify('rejecting a promise calls `shouldRetry`', async () => {
    const retryableSpy = sinon.spy(options, 'shouldRetry')
    const wrapped = makeRetryable(async () => Promise.reject('an exception'), options)

    try {
      await wrapped()
      assert.fail('should have throw exception')
    } catch (e) {
      assert.equal(1, retryableSpy.callCount)
    }
  })

  specify('throws exception if `shouldRetry` says false', () => {
    const wrapped = makeRetryable(alwaysThrow, {
      ...options,
      shouldRetry: () => false
    })

    try {
      wrapped()
      throw 'should not reach here'
    } catch (e) {
      assert.equal('an exception', e)
    }
  })

  specify('throws exception if `shouldRetry` returns Promise<false>', async () => {
    const wrapped = makeRetryable(alwaysThrow, {
      ...options,
      shouldRetry: () => Promise.resolve(false)
    })

    try {
      await wrapped()
      throw 'should not reach here'
    } catch (e) {
      assert.equal('an exception', e)
    }
  })

  specify('throws exception if `shouldRetry` returns Promise<false> for sync wrapped function', (done) => {
    const wrapped = makeRetryable(alwaysThrow, {
      ...options,
      shouldRetry: () => Promise.resolve(false)
    })

    wrapped()

    setTimeout(done, 100)
  })

  specify('calls again if `shouldRetry` returns true', () => {
    const spy = sinon.spy(alwaysThrow)
    const wrapped = makeRetryable(spy, {
      ...options,
      shouldRetry: (count) => count === 1
    })

    try {
      wrapped()
      throw 'should not reach here'
    } catch (e) {
      assert.equal(2, spy.callCount)
      assert.equal('an exception', e)
    }
  })

  specify('calls again if `shouldRetry` returns Promise<true>', async () => {
    const spy = sinon.spy(alwaysThrow)
    const wrapped = makeRetryable(spy, {
      ...options,
      shouldRetry: (count) => Promise.resolve(count === 1)
    })

    try {
      await wrapped()
      throw 'should not reach here'
    } catch (e) {
      assert.equal(2, spy.callCount)
      assert.equal('an exception', e)
    }
  })


  specify('calls again if `shouldRetry` returns Promise<true> for sync wrapped function', (done) => {
    let count = 0
    const targetFn = () => {
      count++
      if (count === 1) throw 'an exception1'
      done()
    }
    const wrapped = makeRetryable(targetFn, {
      ...options,
      shouldRetry: (count) => Promise.resolve(count === 1)
    })

    wrapped()
  })


  specify('retries stop when instructed', () => {
    const retrySome = function (count: number) {
      return count < 4
    }
    const retryableSpy = sinon.spy(retrySome)
    const spy = sinon.spy(alwaysThrow)
    const wrapped = makeRetryable(spy, {
      ...options,
      shouldRetry: retryableSpy
    })

    try {
      wrapped()
      throw 'should throw exception'
    } catch (e) {
      assert.equal(4, retryableSpy.callCount)
      assert.equal(4, spy.callCount)
      assert.equal('an exception', e)
    }
  })

  specify('returns promise result after retries', async () => {
    const retrySome = function (count: number) {
      return count < 4
    }
    const retryableSpy = sinon.spy(retrySome)

    const wrapped = makeRetryable(rejectNTimesThenResolve(3, 'foo', 'too soon'), {
      ...options,
      shouldRetry: retryableSpy
    })

    const result = await wrapped()

    assert.equal('foo', result)
    assert.equal(3, retryableSpy.callCount)
  })

  specify('returns rejected promise after exhausting retries', async () => {
    const retrySome = function (count: number) {
      return count < 3
    }
    const retryableSpy = sinon.spy(retrySome)

    const wrapped = makeRetryable(
      rejectNTimesThenResolve(10, 'foo', 'too soon'), {...options, shouldRetry: retryableSpy})

    const result = wrapped() as Promise<string>

    await result.then((_) => {
      throw 'resolved instead of rejecting'
    })
      .catch(e => {
        assert.equal('too soon', e);
        assert.equal(3, retryableSpy.callCount)
      })
  })

  specify('retries alot if asked', async () => {
    const retrySome = function (count: number) {
      return count < 2000
    }
    const retryableSpy = sinon.spy(retrySome)

    const wrapped = makeRetryable(rejectNTimesThenResolve(999, 'foo', 'too soon'), {
      ...options,
      delay: 0,
      shouldRetry: retryableSpy
    })

    const result = await wrapped()

    assert.equal('foo', result)
    assert.equal(999, retryableSpy.callCount)
  })

  specify('resets retry count for each call', () => {
    const retrySome = function (count: number) {
      return count < 2
    }
    const wrapped = makeRetryable(throwNTimesThenReturn(1, 'a', 'throw me'), {...options, shouldRetry: retrySome})

    assert.deepEqual(['a', 'a', 'a', 'a', 'a'], [wrapped(), wrapped(), wrapped(), wrapped(), wrapped()])
  })

  specify('throws if delay is passed for synchronous function', () => {

      const wrapped = makeRetryable(() => 'foo', {...options, delay: 1000})


      assert.throws(wrapped, /`delay` is not supported for sync functions/)
    }
  )

  specify('waits specified delay before retrying', async () => {

    const clock = sinon.useFakeTimers()

    const wrapped = makeRetryable(
      rejectNTimesThenResolve(1, 'zesh', 'too soon'), {
        ...options,
        shouldRetry: () => true,
        delay: 150
      })

    let state: 'pending'|'resolved' = 'pending'

    const promise = wrapped().then(r => { state='resolved'; return r})

    await clock.tickAsync(100)
    assert.equal('pending', state)

    await clock.tickAsync(100)
    assert.equal('resolved', state)

    assert.equal('zesh', await promise)
  })

})
