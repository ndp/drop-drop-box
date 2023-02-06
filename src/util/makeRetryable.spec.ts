import sinon from "sinon";
import {makeRetryable} from "./makeRetryable";
import {isPending} from "./node";
import {rejectNTimesThenResolve, throwNTimesThenReturn} from "./spec-helpers";
import assert from "node:assert";


describe('makeRetryable', () => {

  const options = {retryable: (e: any) => false}
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

  specify('does not call `retryable` option if no error', () => {
    const wrapped = makeRetryable(() => 'foo', options)
    const spy = sinon.spy(options, 'retryable')

    wrapped()

    assert.equal(0, spy.callCount)
  })

  specify('returns original async function promise result', async () => {
    const wrapped = makeRetryable(async () => 'foo', options)

    const result = await wrapped()

    assert.equal('foo', result)
  })

  specify('does not call `retryable` option if promise resolves', async () => {
    const wrapped = makeRetryable(async () => 'foo', options)
    const spy = sinon.spy(options, 'retryable')

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
        retryable(count: number): boolean {
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

  specify('throwing an exception calls `retryable`', () => {
    const retryableSpy = sinon.spy(options, 'retryable')
    const wrapped = makeRetryable(alwaysThrow, options)

    try {
      wrapped()
      assert.fail('should have throw exception')
    } catch (e) {
      assert.equal(1, retryableSpy.callCount)
    }
  })

  specify('rejecting a promise calls `retryable`', async () => {
    const retryableSpy = sinon.spy(options, 'retryable')
    const wrapped = makeRetryable(async () => Promise.reject('an exception'), options)

    try {
      await wrapped()
      assert.fail('should have throw exception')
    } catch (e) {
      assert.equal(1, retryableSpy.callCount)
    }
  })

  specify('throws exception if `retryable` says false', () => {
    const wrapped = makeRetryable(alwaysThrow, {
      ...options,
      retryable: () => false
    })

    try {
      wrapped()
      throw 'should not reach here'
    } catch (e) {
      assert.equal('an exception', e)
    }
  })

  specify('calls again if `retryable` says true', () => {
    const spy = sinon.spy(alwaysThrow)
    const wrapped = makeRetryable(spy, {
      ...options,
      retryable: (count) => count === 1
    })

    try {
      wrapped()
      throw 'should not reach here'
    } catch (e) {
      assert.equal(2, spy.callCount)
      assert.equal('an exception', e)
    }
  })


  specify('retries stop when instructed', () => {
    const retrySome = function (count: number) {
      return count < 4
    }
    const retryableSpy = sinon.spy(retrySome)
    const spy = sinon.spy(alwaysThrow)
    const wrapped = makeRetryable(spy, {
      ...options,
      retryable: retryableSpy
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
      retryable: retryableSpy
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
      rejectNTimesThenResolve(10, 'foo', 'too soon'), {...options, retryable: retryableSpy})

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
      retryable: retryableSpy
    })

    const result = await wrapped()

    assert.equal('foo', result)
    assert.equal(999, retryableSpy.callCount)
  })

  specify('resets retry count for each call', () => {
    const retrySome = function (count: number) {
      return count < 2
    }
    const wrapped = makeRetryable(throwNTimesThenReturn(1, 'a', 'throw me'), {...options, retryable: retrySome})

    assert.deepEqual(['a', 'a', 'a', 'a', 'a'], [wrapped(), wrapped(), wrapped(), wrapped(), wrapped()])
  })

  specify('throws if delay is passed for synchronous function', () => {

      const wrapped = makeRetryable(() => 'foo', {...options, delay: 1000})


      assert.throws(wrapped, /`delay` is not supported for synchronous functions/)
    }
  )

  specify('waits specified delay before retrying', async () => {

    const clock = sinon.useFakeTimers()

    const wrapped = makeRetryable(
      rejectNTimesThenResolve(1, 'zesh', 'too soon'), {
        ...options,
        retryable: () => true,
        delay: 150
      })

    const promise = wrapped()

    await clock.tickAsync(100)
    assert.equal(true, isPending(promise))

    await clock.tickAsync(100)
    assert.equal(false, isPending(promise))

    assert.equal('zesh', await promise)
  })

})
