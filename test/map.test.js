import test from 'tape'
import factory, { state } from '@set-state/core'
import mapPlugin from '../src/map'

test('state.use(mapPlugin)', t => {
  t.plan(2)
  t.equal(state.plugins.size, 0, 'default state has no plugins')
  state.use(mapPlugin)
  t.ok(state.plugins.has(mapPlugin), 'mapPlugin is added')
})

test('factory(mapper, [mapPlugin])', t => {
  t.plan(1)
  const myState = factory('mapper', [mapPlugin])
  t.ok(myState.plugins.has(mapPlugin), 'mapPlugin is added')
})

test('sync map predicate', t => {
  t.plan(2)
  const g = state.of(0)
  const f = g.map(n => n + 1)
  t.equal(f(), 1)
  f.on(fx => t.equal(fx, 2))
  g(1)
})

test('async map predicate', t => {
  t.plan(2)
  const a = state(1)
  const b = a.map(async n => {
    await sleep(1)
    return n + 1
  })
  b.on(n => t.equal(n, 2), 'after delay')
  t.equal(
    b(),
    undefined,
    'does not update result value until predicate resolves'
  )
})

test('mapped nodes are sealed', t => {
  t.plan(2)
  const g = state(0)
  const f = g.map(n => n + 1)
  t.equal(f(), 1)
  f(2)
  t.equal(f(), 1)
})

test('async map can take an err fn', async t => {
  t.plan(1)
  const a = state(1)
  const b = a.map(
    _a => Promise.reject({ msg: 'failed' }),
    err => t.equal(err.msg, 'failed')
  )
})

test('async map defaults to result value for rejected mapFn', async t => {
  t.plan(1)
  const a = state(1)
  const b = a.map(_a => Promise.reject({ msg: 'failed' }))
  await sleep(1)
  t.deepEqual(b(), { msg: 'failed' })
})

test('async map predicate will catch up on resolved mapFn', async t => {
  t.plan(4)
  const a = state(1)
  const b = a.map(async _a => {
    await sleep(2)
    return { a: _a }
  })
  // first call to mapFn called with value 1
  t.equal(b(), undefined, 'value remains undefined until async is finished')
  await sleep(5)
  t.deepEqual(b(), { a: 1 }, 'result.value updates async')
  let callCount = 0
  b.on(newValue => {
    callCount += 1
    let _a
    switch (callCount) {
      case 1:
        _a = 2
        break
      case 2:
        _a = 4
        break
      default:
    }
    t.deepEqual(
      b(),
      { a: _a },
      'catch up call to mapFn triggered from updated value'
    )
  })
  a(2)
  a(3) // skip this value
  a(4)
})

test('async map predicate will catch up on rejected mapFn', async t => {
  t.plan(4)
  const a = state(1)
  const b = a.map(async _a => {
    await sleep(1)
    return Promise.reject({ msg: `failed from ${_a}` })
  })
  // first call to mapFn called with value 1
  t.equal(b(), undefined, 'value remains undefined until async is finished')
  await sleep(5)
  t.equal(b().msg, 'failed from 1', 'err = result.value')
  let callCount = 0
  b.on(newValue => {
    callCount += 1
    let msg
    switch (callCount) {
      case 1:
        msg = 'failed from 2'
        break
      case 2:
        msg = 'failed from 4'
        break
      default:
    }
    t.deepEqual(
      b(),
      { msg },
      'catch up call to mapFn triggered from updated value'
    )
  })
  a(2)
  a(3) // skip this value
  a(4)
})

test('async map predicate will catch up using errFn on rejected mapFn', async t => {
  t.plan(3)
  const a = state(1)
  const b = a.map(
    async _a => {
      await sleep(1)
      return Promise.reject({ msg: 'failed', value: _a })
    },
    err => t.equal(err.msg, 'failed', `failed from ${err.value}`)
  )
  // first call to mapFn called with value 1
  a(2)
  t.equal(b(), undefined, 'value remains undefined')
})

async function sleep (n) {
  return new Promise(resolve => {
    setTimeout(resolve, n)
  })
}
