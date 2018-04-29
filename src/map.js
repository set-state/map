/**
 * Plugin to add .map() to handle sync and async map predicate
 * @param {function} node
 */
export default function mapPlugin (node) {
  /**
   * Each change in node's value will trigger a call to fn passing the current
   * value unless fn is awaiting a promise. If fn is async, the current value
   * of node is compared to the last call to fn triggering an update if the
   * values differ.
   *
   * If err is not passed, a rejected promise will send its value to result.
   * @param {function} fn calculates the next value based on value changes of node
   * @param {function} [err] optional callback or node
   * @returns {function} result node with the same context as `node`
   * @example
   *  var a = state('a')
   *  var b = a.map(() => <Promise>) // b will have a resolve/reject value, not <Promise>
   *  var c = b.map(() => ...) // c reacts synchronously to changes of b
   */
  node.map = (fn, err) => {
    const result = node.state()
    const cache = (result.locals.map = { value: undefined, awating: false })
    const update = next => {
      result.sealed = false
      result(next)
      result.seal()
    }
    function fastForward () {
      if (node.value !== cache.value) {
        listener(node.value)
      }
    }
    function resolve (next) {
      cache.awaiting = false
      update(next)
      fastForward()
    }
    function reject (next) {
      cache.awaiting = false
      err(next)
      fastForward()
    }
    function listener (value) {
      if (cache.awaiting) return
      cache.value = value
      const next = fn(value)
      if (isPromise(next)) {
        cache.awaiting = true
        next.then(resolve).catch(err ? reject : resolve)
      } else {
        update(next)
      }
    }
    result.cancel = node.on(listener)
    result.seal()
    fastForward()
    return result
  }
}

function isPromise (obj) {
  return !!obj && typeof obj.then === 'function'
}
