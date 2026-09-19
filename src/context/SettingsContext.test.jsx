import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { CUSTOMERS } from '../data/customers.js'
import { ORDERS } from '../data/orders.js'
import { PRODUCTS } from '../data/products.js'
import { ADMIN_ACCOUNT, DEFAULT_SETTINGS } from '../data/settingsDefaults.js'
import { SettingsProvider } from './SettingsContext.jsx'
import { useSettings } from './useSettings.js'

function setup(props = {}) {
  return renderHook(() => useSettings(), {
    wrapper: ({ children }) => <SettingsProvider {...props}>{children}</SettingsProvider>,
  })
}

const GENERAL = { businessName: 'Acme Trading', businessEmail: 'team@acme.example', currency: 'EUR', timeZone: 'Europe/London' }

describe('SettingsProvider', () => {
  it('starts from the defaults, with the demo account and a session', () => {
    const { result } = setup()
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    expect(result.current.account).toBe(ADMIN_ACCOUNT)
    expect(result.current.session.mode).toBe('demo')
    expect(new Date(result.current.session.startedAt).getTime()).not.toBeNaN()
  })

  it('can be started from other settings, which is how saved settings would be loaded later', () => {
    const initial = { ...DEFAULT_SETTINGS, general: { ...DEFAULT_SETTINGS.general, businessName: 'Loaded Co' } }
    expect(setup({ initialSettings: initial }).result.current.settings.general.businessName).toBe('Loaded Co')
  })

  it('throws when used outside a provider', () => {
    expect(() => renderHook(() => useSettings())).toThrow(/useSettings must be used within a SettingsProvider/)
  })
})

describe('saveGeneral', () => {
  it('validates, trims and stores the new values', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.saveGeneral({ ...GENERAL, businessName: '  Acme Trading  ' })
    })
    expect(outcome).toEqual({ ok: true, errors: {} })
    expect(result.current.settings.general).toEqual(GENERAL)
  })

  it('refuses invalid values, reports every error, and changes nothing', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.saveGeneral({ ...GENERAL, businessName: '', businessEmail: 'nope' })
    })
    expect(outcome.ok).toBe(false)
    expect(Object.keys(outcome.errors).sort()).toEqual(['businessEmail', 'businessName'])
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('leaves notifications and appearance untouched', () => {
    const { result } = setup()
    act(() => {
      result.current.setNotification('orders', false)
    })
    act(() => {
      result.current.saveGeneral(GENERAL)
    })
    expect(result.current.settings.notifications.orders).toBe(false)
    expect(result.current.settings.appearance).toEqual(DEFAULT_SETTINGS.appearance)
  })
})

describe('setNotification', () => {
  it('switches one notification without touching the others', () => {
    const { result } = setup()
    act(() => {
      result.current.setNotification('lowStock', false)
    })
    expect(result.current.settings.notifications).toEqual({ ...DEFAULT_SETTINGS.notifications, lowStock: false })
    act(() => {
      result.current.setNotification('customerActivity', true)
    })
    expect(result.current.settings.notifications).toEqual({ ...DEFAULT_SETTINGS.notifications, lowStock: false, customerActivity: true })
  })

  it('refuses unknown keys and non-boolean values', () => {
    const { result } = setup()
    let unknown
    let notBoolean
    act(() => {
      unknown = result.current.setNotification('sms', true)
      notBoolean = result.current.setNotification('orders', 'yes')
    })
    expect(unknown.ok).toBe(false)
    expect(notBoolean.ok).toBe(false)
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('does nothing, and does not call onChange, when the value is already set', () => {
    const onChange = vi.fn()
    const { result } = setup({ onChange })
    act(() => {
      result.current.setNotification('orders', true)
    })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('setAppearance', () => {
  it('sets the theme preference and reduce motion', () => {
    const { result } = setup()
    act(() => {
      result.current.setAppearance({ theme: 'system' })
    })
    act(() => {
      result.current.setAppearance({ reduceMotion: true })
    })
    expect(result.current.settings.appearance).toEqual({ theme: 'system', reduceMotion: true })
  })

  it('refuses the unavailable Light theme, unknown themes and a non-boolean reduce motion', () => {
    const { result } = setup()
    let light
    let unknown
    let motion
    act(() => {
      light = result.current.setAppearance({ theme: 'light' })
      unknown = result.current.setAppearance({ theme: 'purple' })
      motion = result.current.setAppearance({ reduceMotion: 'sure' })
    })
    expect([light.ok, unknown.ok, motion.ok]).toEqual([false, false, false])
    expect(result.current.settings.appearance).toEqual(DEFAULT_SETTINGS.appearance)
  })

  it('applies the preferences to the document, and removes them when the provider goes away', () => {
    const { result, unmount } = setup()
    const root = document.documentElement
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.reduceMotion).toBe('false')

    act(() => {
      result.current.setAppearance({ theme: 'system', reduceMotion: true })
    })
    expect(root.dataset.theme).toBe('dark') // System resolves to the one theme Nexa has
    expect(root.dataset.reduceMotion).toBe('true')

    unmount()
    expect(root.dataset.theme).toBeUndefined()
    expect(root.dataset.reduceMotion).toBeUndefined()
  })
})

describe('the seam for future persistence', () => {
  it('calls onChange with the complete settings after every successful change, and only then', () => {
    const onChange = vi.fn()
    const { result } = setup({ onChange })

    act(() => {
      result.current.saveGeneral({ ...GENERAL, businessName: '' }) // invalid
    })
    expect(onChange).not.toHaveBeenCalled()

    act(() => {
      result.current.saveGeneral(GENERAL)
    })
    act(() => {
      result.current.setNotification('email', false)
    })
    act(() => {
      result.current.setAppearance({ reduceMotion: true })
    })

    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenLastCalledWith({
      general: GENERAL,
      notifications: { ...DEFAULT_SETTINGS.notifications, email: false },
      appearance: { theme: 'dark', reduceMotion: true },
    })
  })

  it('uses the latest onChange without needing to be recreated', () => {
    const first = vi.fn()
    const second = vi.fn()
    let current = first
    const { result, rerender } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <SettingsProvider onChange={current}>{children}</SettingsProvider>,
    })
    current = second
    rerender()
    act(() => {
      result.current.setNotification('orders', false)
    })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})

describe('isolation from the business data', () => {
  it('works with no other provider, and changing every setting leaves orders, customers and products untouched', () => {
    const before = JSON.stringify({ ORDERS, CUSTOMERS, PRODUCTS })
    const { result } = setup() // rendered alone: Settings depends on nothing else

    act(() => {
      result.current.saveGeneral(GENERAL)
    })
    act(() => {
      result.current.setNotification('orders', false)
    })
    act(() => {
      result.current.setAppearance({ theme: 'system', reduceMotion: true })
    })

    expect(JSON.stringify({ ORDERS, CUSTOMERS, PRODUCTS })).toBe(before)
  })
})
