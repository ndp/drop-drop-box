import sinon from "sinon";
import {expect, util} from "chai";
import {makeRetryable} from "./makeRetryable";
import * as FakeTimers from '@sinonjs/fake-timers'
import assert from "node:assert";
import {isPending} from "./node";






function rejectNTimesThenResolve<T>(n: number, result: T) {
  return () => n-- > 0
    ? Promise.reject('too soon')
    : Promise.resolve(result)
}

function throwNTimesThenReturn<T>(n: number, result: T) {
  return () => {
    if (n-- > 0)
      throw 'too soon'
    return result
  }
}


describe('makeRetryable', () => {


  const yawnOptions = {retryable: (e: any) => false}
  const alwaysThrow = function () {
    throw 'an exception'
  }


  afterEach(() => {
    sinon.verifyAndRestore()
  })

  specify('returns original function result', () => {
    const wrapped = makeRetryable(() => 'foo', yawnOptions)

    const result = wrapped()

    expect(result).to.equal('foo')
  })

  specify('returns original function promise result', async () => {
    const wrapped = makeRetryable(async () => 'foo', yawnOptions)

    const result = await wrapped()

    expect(result).to.equal('foo')
  })

  specify('does not call `retryable` option if promise resolves', async () => {
    const wrapped = makeRetryable(async () => 'foo', yawnOptions)
    const spy = sinon.spy(yawnOptions, 'retryable')

    await wrapped()

    expect(spy.callCount).to.equal(0)
  })

  specify('does not call `retryable` option if no error', async () => {
    const wrapped = makeRetryable(() => 'foo', yawnOptions)
    const spy = sinon.spy(yawnOptions, 'retryable')

    wrapped()

    expect(spy.callCount).to.equal(0)
  })

  specify('original function receives wrapped function’s parameters', async () => {
    const spy = sinon.spy((a: number, b: string) => Promise.resolve('haha'))

    const wrapped = makeRetryable(spy, yawnOptions)

    const result = await wrapped(1, 'a')

    expect(spy.calledOnce).to.equal(true)
    expect(spy.getCall(0).firstArg).to.equal(1)
    expect(spy.getCall(0).args[1]).to.equal('a')
  })

  specify('preserves "this"')

  specify('throwing an exception calls `retryable`', () => {
    const retryableSpy = sinon.spy(yawnOptions, 'retryable')
    const wrapped = makeRetryable(alwaysThrow, yawnOptions)

    try {
      wrapped()
      throw 'should throw exception'
    } catch (e) {
      expect(retryableSpy.callCount).to.equal(1)
    }
  })

  specify('rejecting promise calls `retryable`', async () => {
    const retryableSpy = sinon.spy(yawnOptions, 'retryable')
    const wrapped = makeRetryable(async () => Promise.reject('an exception'), yawnOptions)

    try {
      await wrapped()
      throw 'should throw exception'
    } catch (e) {
      expect(retryableSpy.callCount).to.equal(1)
    }
  })

  specify('throws exception if `retryable` says false', () => {
    const wrapped = makeRetryable(alwaysThrow, {
      ...yawnOptions,
      retryable: () => false
    })

    try {
      wrapped()
      throw 'should not reach here'
    } catch (e) {
      expect(e).to.equal('an exception')
    }
  })

  specify('calls again if `retryable` says true', () => {
    const spy = sinon.spy(alwaysThrow)
    const wrapped = makeRetryable(spy, {
      ...yawnOptions,
      retryable: (count) => count === 1
    })

    try {
      wrapped()
      throw 'should not reach here'
    } catch (e) {
      expect(spy.callCount).to.equal(2)
      expect(e).to.equal('an exception')
    }
  })


  specify('retries stop when instructed', () => {
    const retrySome = function (count: number) {
      return count < 4
    }
    const retryableSpy = sinon.spy(retrySome)
    const spy = sinon.spy(alwaysThrow)
    const wrapped = makeRetryable(spy, {
      ...yawnOptions,
      retryable: retryableSpy
    })

    try {
      wrapped()
      throw 'should throw exception'
    } catch (e) {
      expect(retryableSpy.callCount).to.equal(4)
      expect(spy.callCount).to.equal(4)
      expect(e).to.equal('an exception')
    }
  })

  specify('returns promise result after retries', async () => {
    const retrySome = function (count: number) {
      return count < 4
    }
    const retryableSpy = sinon.spy(retrySome)

    const wrapped = makeRetryable(rejectNTimesThenResolve(3, 'foo'), {...yawnOptions, retryable: retryableSpy})

    const result = await wrapped()

    expect(result).to.equal('foo')
    expect(retryableSpy.callCount).to.eq(3)
  })

  specify('returns rejected promise after exhausting retries', async () => {
    const retrySome = function (count: number) {
      return count < 3
    }
    const retryableSpy = sinon.spy(retrySome)

    const wrapped = makeRetryable(
      rejectNTimesThenResolve(10, 'foo'), {...yawnOptions, retryable: retryableSpy})

    const result = wrapped() as Promise<string>

    await result.then((_) => {
      throw 'resolved instead of rejecting'
    })
      .catch(e => {
        expect(e).to.equal('too soon');
        expect(retryableSpy.callCount).to.eq(3)
      })
  })

  specify('retries alot if asked', async () => {
    const retrySome = function (count: number) {
      return count < 2000
    }
    const retryableSpy = sinon.spy(retrySome)

    const wrapped = makeRetryable(rejectNTimesThenResolve(999, 'foo'), {...yawnOptions, retryable: retryableSpy})

    const result = await wrapped()

    expect(result).to.equal('foo')
    expect(retryableSpy.callCount).to.eq(999)
  })

  specify('resets retry count for each call', () => {
    const retrySome = function (count: number) {
      return count < 2
    }
    const wrapped = makeRetryable(throwNTimesThenReturn(1, 'a'), {...yawnOptions, retryable: retrySome})

    expect([wrapped(), wrapped(), wrapped(), wrapped(), wrapped()]).to.deep.equal(['a', 'a', 'a', 'a', 'a'])
  })

  specify('throws if delay is passed for synchronous function', () => {

      const wrapped = makeRetryable(() => 'foo', {...yawnOptions, delay: 1000})

      expect(() => {
        wrapped()
      }).to.throws('`delay` is not supported for synchronous functions')
    }
  )


  specify('standard', () => {
    const clock = sinon.useFakeTimers({
      now: 1483228800000,
      toFake: ["setTimeout", "nextTick"],
    });

    let called = false;

    process.nextTick(function () {
      called = true;
    });

    clock.runAll(); //forces nextTick calls to flush synchronously
    assert(called); //true

  })


  specify('waits specified delay before retrying', async () => {

    const clock = sinon.useFakeTimers()
    // FakeTimers.install()

    const wrapped = makeRetryable(rejectNTimesThenResolve(1, 'zesh'), {
      ...yawnOptions,
      retryable: () => true,
      delay: 150
    })

    const promise = wrapped()

    await clock.tickAsync(100)
    expect(isPending(promise)).to.equal(true)

    await clock.tickAsync(100)
    expect(isPending(promise)).to.equal(false)

    expect(await promise).to.equal('zesh')
  })


})
