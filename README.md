# @set-state/map

[![npm version](https://img.shields.io/npm/v/@set-state/map.svg)](https://www.npmjs.com/package/@set-state/map)
[![Build Status](https://travis-ci.org/set-state/map.svg?branch=master)](https://travis-ci.org/set-state/map)
[![Coverage Status](https://coveralls.io/repos/github/set-state/map/badge.svg?branch=master)](https://coveralls.io/github/set-state/map?branch=master)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
[![Codestyle Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)
[![conduct](https://img.shields.io/badge/code%20of%20conduct-contributor%20covenant-green.svg)](http://contributor-covenant.org/version/1/4/)

`.map()` [plugin](https://github.com/set-state/core#plugin) for [@set-state](https://www.npmjs.com/package/@set-state/core)

By Paul Grenier (@AutoSponge)

`@set-state/map` plugs into a [factory](https://github.com/set-state/core#factory) or [state](https://github.com/set-state/core#state) function. Any [node](https://github.com/set-state/core#node) created will have the `.map()` function.

## Getting Started

`npm install --save @set-state/core @set-state/map`

<!-- js
const factory = require('@set-state/core')
const state = factory.state
const mapPlugin = require('./dist/map')
const render = renderError = () => {}
-->

```js
// import factory, {state} from '@set-state/core'
// import mapPlugin from '@set-state/map'
state.use(mapPlugin)
```

## How to use it

Calling `node.map(predicate)` creates a ["sealed"](https://set-state.github.io/core/#nodeseal) `node` based on the return value of the predicate function. The predicate recieves the node's value as a parameter.

Mapped nodes update synchronously if their predicate returns a non-Promise value.

```js
const str = state('beep')
const bang = str.map(val => `${val}!`)
bang() // => 'beep!'
bang('foo') // bang is sealed, so this is ignored. Safety first!
bang() // => 'beep!'
```

Calling `node.map(predicate, errorHandler)` creates a ["sealed"](https://set-state.github.io/core/#nodeseal) `node` that will update its value when the predicate resolves. If the predicate rejects or throws, the errorHandler will be called passing the error as a parameter.

This example demonstrates how you can use `.map` asynchronously.

```js
const selectedItem = state()
const selectedItemData = selectedItem.map(id => {
  if (!id) return {msg: 'select an item'} // sync value
  return fetch(`/api/items/${id}`) // async value
    .then(res => res.json())
}, renderError)
selectedItemData.on(render)
```

Note:

`.map()` has two additional features for async predicates to prevent memory leaks, update storms, and out-of-sync state.

First, similar to a "debounce", mapped nodes will not invoke the predicate while awaiting a new value from a previous invocation.

Second, when the mapped node updates value, if the cached `node.value` differs from the current `node.value`, it will call the predicate again with the latest value attempting to "fast forward" to the correct state.

```js
const a = state(0)
const b = a.map(n => n + 1)
b
/*
{ [Function: f]
  [...omitted]
  locals: {
    map: {            <== map's cache object
      value: 0,       <== value of a used to invoke the predicate
      awating: false  <== update was synchronous
    }
  },
  map: [Function],    <== the map method
  value: 1            <== current value of b
}
*/
```