/**
 * A controllable stand-in for window.matchMedia, which jsdom does not implement. It models the one
 * thing Nexa reads: the device's light/dark preference. `(prefers-color-scheme: light)` matches while
 * the device is light, `(prefers-color-scheme: dark)` while it is not, and every other query is false.
 *
 * Usage:
 *   const device = installMatchMedia({ light: false })
 *   device.setLight(true)          // the user flips their OS to light: listeners are notified
 *   device.listenerCount()         // how many change listeners are currently attached
 *   device.uninstall()             // back to jsdom's "no matchMedia"
 *
 * `legacy: true` provides only the old addListener/removeListener API, as older Safari does.
 */
export function installMatchMedia({ light = false, legacy = false } = {}) {
  const state = { light }
  const listeners = new Set()
  const original = window.matchMedia

  const matchesQuery = (query) => {
    if (query.includes('prefers-color-scheme: light')) return state.light
    if (query.includes('prefers-color-scheme: dark')) return !state.light
    return false
  }

  window.matchMedia = (query) => {
    const list = {
      media: query,
      onchange: null,
      get matches() {
        return matchesQuery(query)
      },
    }
    if (legacy) {
      list.addListener = (listener) => listeners.add(listener)
      list.removeListener = (listener) => listeners.delete(listener)
    } else {
      list.addEventListener = (type, listener) => type === 'change' && listeners.add(listener)
      list.removeEventListener = (type, listener) => type === 'change' && listeners.delete(listener)
    }
    return list
  }

  return {
    setLight(next) {
      state.light = next
      Array.from(listeners).forEach((listener) => listener({ matches: next, media: '(prefers-color-scheme: light)' }))
    },
    listenerCount: () => listeners.size,
    uninstall() {
      if (original === undefined) delete window.matchMedia
      else window.matchMedia = original
      listeners.clear()
    },
  }
}
