import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installMatchMedia } from '../test/matchMediaMock.js'
import {
  DEFAULT_THEME_CHOICE,
  SYSTEM_LIGHT_QUERY,
  THEME_CHOICES,
  THEME_STORAGE_KEY,
  getSystemLightQuery,
  readStoredTheme,
  subscribeToSystemTheme,
  systemPrefersLight,
  writeStoredTheme,
} from './themePreference.js'
import { resolveTheme } from './settingsRules.js'

const fakeStorage = (initial = {}) => {
  const data = { ...initial }
  return { getItem: (key) => (key in data ? data[key] : null), setItem: (key, value) => void (data[key] = String(value)), data }
}

describe('constants', () => {
  it('offer three choices with dark as the default', () => {
    expect(THEME_CHOICES).toEqual(['dark', 'light', 'system'])
    expect(DEFAULT_THEME_CHOICE).toBe('dark')
    expect(THEME_STORAGE_KEY).toBe('nexa-theme')
    expect(SYSTEM_LIGHT_QUERY).toBe('(prefers-color-scheme: light)')
  })
})

describe('reading the saved choice', () => {
  it('returns null when nothing is saved, so the default applies', () => {
    expect(readStoredTheme(fakeStorage())).toBeNull()
    expect(readStoredTheme()).toBeNull() // the real (empty) localStorage
  })

  it.each(THEME_CHOICES)('returns a saved %s', (choice) => {
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: choice }))).toBe(choice)
  })

  it.each(['purple', '', 'Light', 'DARK', 'true', '{"theme":"light"}'])('ignores an invalid saved value (%j)', (value) => {
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: value }))).toBeNull()
  })

  it('does not throw when reading fails, or when storage is missing', () => {
    const broken = { getItem: () => { throw new Error('SecurityError') } }
    expect(readStoredTheme(broken)).toBeNull()
    expect(readStoredTheme(null)).toBeNull()
  })

  it('does not throw when merely touching window.localStorage is blocked', () => {
    const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStoredTheme()).toBeNull()
    expect(writeStoredTheme('light')).toBe(false)
    spy.mockRestore()
  })
})

describe('saving a choice', () => {
  it.each(THEME_CHOICES)('stores %s under the Nexa key', (choice) => {
    const storage = fakeStorage()
    expect(writeStoredTheme(choice, storage)).toBe(true)
    expect(storage.data).toEqual({ [THEME_STORAGE_KEY]: choice })
  })

  it('refuses anything that is not a theme choice, and stores nothing', () => {
    const storage = fakeStorage()
    ;['purple', '', undefined, null, 42].forEach((value) => expect(writeStoredTheme(value, storage)).toBe(false))
    expect(storage.data).toEqual({})
  })

  it('reports failure, without throwing, when storage is full or blocked', () => {
    const full = { setItem: () => { throw new Error('QuotaExceededError') } }
    expect(writeStoredTheme('light', full)).toBe(false)
  })

  it('round-trips through the real localStorage', () => {
    expect(writeStoredTheme('light')).toBe(true)
    expect(readStoredTheme()).toBe('light')
    expect(window.localStorage.getItem('nexa-theme')).toBe('light')
  })
})

describe('the device preference', () => {
  let device
  afterEach(() => device?.uninstall())

  it('is treated as dark (Nexa’s default) where matchMedia does not exist', () => {
    expect(window.matchMedia).toBeUndefined() // jsdom
    expect(getSystemLightQuery()).toBeNull()
    expect(systemPrefersLight()).toBe(false)
    expect(subscribeToSystemTheme(() => {})).toBeTypeOf('function') // a no-op unsubscribe, not a crash
  })

  it.each([[true], [false]])('reads the device when it is light: %s', (light) => {
    device = installMatchMedia({ light })
    expect(systemPrefersLight()).toBe(light)
  })

  it('notifies subscribers when the device changes, and stops after unsubscribe', () => {
    device = installMatchMedia({ light: false })
    const onChange = vi.fn()
    const stop = subscribeToSystemTheme(onChange)
    expect(device.listenerCount()).toBe(1)

    device.setLight(true)
    device.setLight(false)
    expect(onChange).toHaveBeenCalledTimes(2)

    stop()
    expect(device.listenerCount()).toBe(0)
    device.setLight(true)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('works with the older addListener API too', () => {
    device = installMatchMedia({ light: false, legacy: true })
    const onChange = vi.fn()
    const stop = subscribeToSystemTheme(onChange)
    expect(device.listenerCount()).toBe(1)
    device.setLight(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    stop()
    expect(device.listenerCount()).toBe(0)
  })
})

/**
 * index.html applies the saved theme before the first paint with its own copy of these rules. This
 * runs that real script against fake browser objects and checks it always agrees with the app.
 */
describe('the pre-paint script in index.html', () => {
  const html = readFileSync(join(import.meta.dirname, '..', '..', 'index.html'), 'utf8')
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]

  function runScript({ saved, deviceLight, storageThrows = false, noMatchMedia = false }) {
    const attributes = {}
    const localStorage = {
      getItem: () => {
        if (storageThrows) throw new Error('blocked')
        return saved ?? null
      },
    }
    const window = { matchMedia: noMatchMedia ? undefined : (query) => ({ matches: query === SYSTEM_LIGHT_QUERY ? deviceLight : !deviceLight }) }
    const document = { documentElement: { setAttribute: (name, value) => (attributes[name] = value) } }
    new Function('localStorage', 'window', 'document', script)(localStorage, window, document)
    return attributes['data-theme']
  }

  it('uses the same storage key and media query as the app', () => {
    expect(script).toContain(`'${THEME_STORAGE_KEY}'`)
    expect(script).toContain(`'${SYSTEM_LIGHT_QUERY}'`)
  })

  it.each([
    [undefined, false], [undefined, true],
    ['dark', false], ['dark', true],
    ['light', false], ['light', true],
    ['system', false], ['system', true],
    ['purple', true], ['', true],
  ])('saved=%s, device light=%s: applies the same theme as the app', (saved, deviceLight) => {
    const stored = saved === undefined ? null : THEME_CHOICES.includes(saved) ? saved : null
    const expected = resolveTheme(stored ?? DEFAULT_THEME_CHOICE, deviceLight)
    expect(runScript({ saved, deviceLight })).toBe(expected)
  })

  it('stays on dark when storage is blocked or matchMedia is missing', () => {
    expect(runScript({ saved: 'light', storageThrows: true })).toBe('dark')
    expect(runScript({ saved: 'system', noMatchMedia: true })).toBe('dark')
    expect(runScript({ saved: 'light', noMatchMedia: true })).toBe('light') // an explicit choice needs no device
  })
})
