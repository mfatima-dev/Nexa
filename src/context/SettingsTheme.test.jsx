import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { DEFAULT_SETTINGS } from '../data/settingsDefaults.js'
import { installMatchMedia } from '../test/matchMediaMock.js'
import { SettingsProvider } from './SettingsContext.jsx'
import { useSettings } from './useSettings.js'

const root = () => document.documentElement
const stored = () => window.localStorage.getItem('nexa-theme')

function setup(props = {}) {
  return renderHook(() => useSettings(), {
    wrapper: ({ children }) => <SettingsProvider {...props}>{children}</SettingsProvider>,
  })
}
const choose = (result, theme) =>
  act(() => {
    result.current.setAppearance({ theme })
  })

let device
afterEach(() => {
  device?.uninstall()
  device = undefined
  vi.restoreAllMocks()
})

describe('the default theme', () => {
  it('is dark when no preference exists, and nothing is written just for starting up', () => {
    const { result } = setup()
    expect(result.current.settings.appearance.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(root().dataset.theme).toBe('dark')
    expect(stored()).toBeNull()
  })

  it('ignores a saved value it does not recognise', () => {
    window.localStorage.setItem('nexa-theme', 'purple')
    const { result } = setup()
    expect(result.current.settings.appearance.theme).toBe('dark')
    expect(root().dataset.theme).toBe('dark')
  })
})

describe('choosing a theme', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ])('%s applies at once and is remembered', (choice, applied) => {
    const { result } = setup()
    if (choice === 'dark') choose(result, 'light') // so that Dark is a real change
    choose(result, choice)

    expect(result.current.settings.appearance.theme).toBe(choice)
    expect(result.current.resolvedTheme).toBe(applied)
    expect(root().dataset.theme).toBe(applied)
    expect(stored()).toBe(choice)
  })

  it('System is remembered as "system", not as whichever theme it currently resolves to', () => {
    device = installMatchMedia({ light: true })
    const { result } = setup()
    choose(result, 'system')
    expect(stored()).toBe('system')
    expect(result.current.settings.appearance.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('a refused choice changes nothing and is not remembered', () => {
    const { result } = setup()
    choose(result, 'light')
    choose(result, 'purple')
    expect(result.current.settings.appearance.theme).toBe('light')
    expect(stored()).toBe('light')
  })

  it('leaves every other setting exactly as it was', () => {
    const { result } = setup()
    choose(result, 'light')
    expect(result.current.settings.general).toEqual(DEFAULT_SETTINGS.general)
    expect(result.current.settings.notifications).toEqual(DEFAULT_SETTINGS.notifications)
  })
})

describe('remembering the theme across a reload', () => {
  it.each(['light', 'dark', 'system'])('%s is still selected after a reload', (choice) => {
    device = installMatchMedia({ light: true })
    const first = setup()
    choose(first.result, choice === 'dark' ? 'light' : choice)
    if (choice === 'dark') choose(first.result, 'dark')
    first.unmount() // the page goes away...

    const second = setup() // ...and comes back
    expect(second.result.current.settings.appearance.theme).toBe(choice)
  })

  it('applies the remembered theme straight away on startup', () => {
    window.localStorage.setItem('nexa-theme', 'light')
    const { result } = setup()
    expect(result.current.resolvedTheme).toBe('light')
    expect(root().dataset.theme).toBe('light')
  })

  it('a remembered choice wins over the settings the provider was started with', () => {
    window.localStorage.setItem('nexa-theme', 'dark')
    const starting = { ...DEFAULT_SETTINGS, appearance: { ...DEFAULT_SETTINGS.appearance, theme: 'light' } }
    expect(setup({ initialSettings: starting }).result.current.settings.appearance.theme).toBe('dark')
  })

  it('the starting settings apply when nothing is remembered', () => {
    const starting = { ...DEFAULT_SETTINGS, appearance: { ...DEFAULT_SETTINGS.appearance, theme: 'light' } }
    expect(setup({ initialSettings: starting }).result.current.resolvedTheme).toBe('light')
  })

  it('Reduce motion is a session setting: it does not survive a reload, and does not disturb the theme', () => {
    const first = setup()
    choose(first.result, 'light')
    act(() => {
      first.result.current.setAppearance({ reduceMotion: true })
    })
    expect(root().dataset.reduceMotion).toBe('true')
    expect(root().dataset.theme).toBe('light')
    first.unmount()

    const second = setup()
    expect(second.result.current.settings.appearance).toEqual({ theme: 'light', reduceMotion: false })
  })
})

describe('System follows the device', () => {
  it.each([
    [true, 'light'],
    [false, 'dark'],
  ])('with the device preferring light=%s, System shows %s', (light, expected) => {
    device = installMatchMedia({ light })
    const { result } = setup()
    choose(result, 'system')
    expect(result.current.resolvedTheme).toBe(expected)
    expect(root().dataset.theme).toBe(expected)
  })

  it('starts on the right theme when System was remembered and the device is light', () => {
    device = installMatchMedia({ light: true })
    window.localStorage.setItem('nexa-theme', 'system')
    const { result } = setup()
    expect(result.current.resolvedTheme).toBe('light')
    expect(root().dataset.theme).toBe('light')
  })

  it('responds when the device changes, in both directions, without any user action', () => {
    device = installMatchMedia({ light: false })
    const { result } = setup()
    choose(result, 'system')
    expect(root().dataset.theme).toBe('dark')

    act(() => device.setLight(true))
    expect(result.current.resolvedTheme).toBe('light')
    expect(root().dataset.theme).toBe('light')

    act(() => device.setLight(false))
    expect(root().dataset.theme).toBe('dark')

    act(() => device.setLight(true))
    expect(root().dataset.theme).toBe('light')
  })

  it('never permanently forces a theme: it keeps following after several flips', () => {
    device = installMatchMedia({ light: false })
    const { result } = setup()
    choose(result, 'system')
    ;[true, false, true, false, true].forEach((light) => {
      act(() => device.setLight(light))
      expect(root().dataset.theme).toBe(light ? 'light' : 'dark')
    })
    expect(result.current.settings.appearance.theme).toBe('system') // still "system", never rewritten
    expect(stored()).toBe('system')
  })

  it('Dark and Light ignore the device entirely', () => {
    device = installMatchMedia({ light: false })
    const { result } = setup()
    choose(result, 'light')
    act(() => device.setLight(false))
    act(() => device.setLight(true))
    expect(root().dataset.theme).toBe('light')

    choose(result, 'dark')
    act(() => device.setLight(true))
    expect(root().dataset.theme).toBe('dark')
  })

  it('choosing System again picks up the device as it is now, not as it was', () => {
    device = installMatchMedia({ light: false })
    const { result } = setup()
    choose(result, 'system')
    choose(result, 'dark')
    act(() => device.setLight(true)) // the OS changes while Dark is chosen
    expect(root().dataset.theme).toBe('dark')
    choose(result, 'system')
    expect(root().dataset.theme).toBe('light')
  })

  it('works with browsers that only have the older listener API', () => {
    device = installMatchMedia({ light: false, legacy: true })
    const { result } = setup()
    choose(result, 'system')
    act(() => device.setLight(true))
    expect(root().dataset.theme).toBe('light')
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('stays on dark, and does not crash, where the browser cannot report a preference', () => {
    expect(window.matchMedia).toBeUndefined()
    const { result } = setup()
    choose(result, 'system')
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('stops listening to the device when the provider goes away', () => {
    device = installMatchMedia({ light: false })
    const { result, unmount } = setup()
    choose(result, 'system')
    expect(device.listenerCount()).toBe(1)
    unmount()
    expect(device.listenerCount()).toBe(0)
    expect(() => device.setLight(true)).not.toThrow()
  })
})

describe('when the browser will not store anything', () => {
  it('the theme still works for the session', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { result } = setup()
    expect(() => choose(result, 'light')).not.toThrow()
    expect(result.current.resolvedTheme).toBe('light')
    expect(root().dataset.theme).toBe('light')
  })

  it('reading a blocked store falls back to dark', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const { result } = setup()
    expect(result.current.resolvedTheme).toBe('dark')
  })
})

describe('the theme through onChange', () => {
  it('reports the chosen theme (not the resolved one) in the settings object', () => {
    device = installMatchMedia({ light: true })
    const onChange = vi.fn()
    const { result } = setup({ onChange })
    choose(result, 'system')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ appearance: { theme: 'system', reduceMotion: false } }))
  })
})
