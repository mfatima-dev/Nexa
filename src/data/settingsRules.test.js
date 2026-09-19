import { describe, expect, it } from 'vitest'
import { CURRENCY_OPTIONS, DEFAULT_SETTINGS, THEME_OPTIONS, TIME_ZONE_OPTIONS } from './settingsDefaults.js'
import {
  BUSINESS_NAME_MAX,
  EMAIL_MAX,
  generalChanged,
  getDeviceTimeZone,
  getInitials,
  isSelectableTheme,
  normalizeGeneral,
  resolveTheme,
  validateGeneral,
} from './settingsRules.js'

const valid = { ...DEFAULT_SETTINGS.general }

describe('the default settings', () => {
  it('are valid, dark, and keep Nexa’s single theme', () => {
    expect(validateGeneral(DEFAULT_SETTINGS.general)).toEqual({})
    expect(DEFAULT_SETTINGS.appearance).toEqual({ theme: 'dark', reduceMotion: false })
    expect(DEFAULT_SETTINGS.general.currency).toBe('USD')
  })

  it('only offer currencies and time zones that validation accepts, and time zones the platform knows', () => {
    CURRENCY_OPTIONS.forEach((option) => expect(validateGeneral({ ...valid, currency: option.value })).toEqual({}))
    TIME_ZONE_OPTIONS.forEach((option) => {
      expect(validateGeneral({ ...valid, timeZone: option.value })).toEqual({})
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: option.value })).not.toThrow()
    })
  })

  it('use only tokens and words from the existing design (no purple theme, one dark theme)', () => {
    expect(THEME_OPTIONS.map((option) => option.value)).toEqual(['dark', 'system', 'light'])
    expect(THEME_OPTIONS.find((option) => option.value === 'light').disabled).toBe(true)
  })
})

describe('validateGeneral: business name', () => {
  it.each([
    ['', 'Enter your business name.'],
    ['   ', 'Enter your business name.'],
    ['A', 'Business name must be at least 2 characters.'],
    [' A ', 'Business name must be at least 2 characters.'], // whitespace does not count
    ['x'.repeat(BUSINESS_NAME_MAX + 1), `Business name must be ${BUSINESS_NAME_MAX} characters or fewer.`],
  ])('rejects %j', (businessName, message) => {
    expect(validateGeneral({ ...valid, businessName }).businessName).toBe(message)
  })

  it('accepts the shortest and longest allowed names, with or without surrounding spaces', () => {
    expect(validateGeneral({ ...valid, businessName: 'AB' })).toEqual({})
    expect(validateGeneral({ ...valid, businessName: 'x'.repeat(BUSINESS_NAME_MAX) })).toEqual({})
    expect(validateGeneral({ ...valid, businessName: '  Acme & Sons  ' })).toEqual({})
  })
})

describe('validateGeneral: business email', () => {
  it.each(['', '   '])('requires an email (%j)', (businessEmail) => {
    expect(validateGeneral({ ...valid, businessEmail }).businessEmail).toBe('Enter a business email address.')
  })

  it.each(['plainaddress', 'missing-at.example.com', 'a@b', 'a b@example.com', '@example.com', 'name@', 'name@.com '.replace('.com ', '')])(
    'rejects the malformed address %j',
    (businessEmail) => {
      expect(validateGeneral({ ...valid, businessEmail }).businessEmail).toBe('Enter a valid email address, like name@company.com.')
    },
  )

  it.each(['hello@nexa.example', 'first.last+tag@sub.domain.co.uk', '  padded@example.com  '])('accepts %j', (businessEmail) => {
    expect(validateGeneral({ ...valid, businessEmail })).toEqual({})
  })

  it('rejects an address longer than the maximum', () => {
    const tooLong = `${'a'.repeat(EMAIL_MAX)}@example.com`
    expect(validateGeneral({ ...valid, businessEmail: tooLong }).businessEmail).toContain('characters or fewer')
  })
})

describe('validateGeneral: currency, time zone and robustness', () => {
  it('only accepts listed currencies and time zones', () => {
    expect(validateGeneral({ ...valid, currency: 'XXX' }).currency).toBe('Choose a currency from the list.')
    expect(validateGeneral({ ...valid, timeZone: 'Mars/Olympus' }).timeZone).toBe('Choose a time zone from the list.')
    expect(validateGeneral({ ...valid, currency: '', timeZone: '' })).toMatchObject({ currency: expect.any(String), timeZone: expect.any(String) })
  })

  it('reports every problem at once', () => {
    expect(Object.keys(validateGeneral({ businessName: '', businessEmail: 'nope', currency: 'ZZZ', timeZone: 'nowhere' })).sort()).toEqual([
      'businessEmail',
      'businessName',
      'currency',
      'timeZone',
    ])
  })

  it('does not throw on missing or non-string values', () => {
    expect(() => validateGeneral({})).not.toThrow()
    expect(validateGeneral({ businessName: null, businessEmail: 42, currency: undefined, timeZone: null })).toMatchObject({
      businessName: expect.any(String),
      businessEmail: expect.any(String),
    })
  })
})

describe('normalizing and comparing', () => {
  it('trims the text fields and leaves the choices alone', () => {
    expect(normalizeGeneral({ businessName: '  Acme  ', businessEmail: ' a@b.co ', currency: 'EUR', timeZone: 'UTC' })).toEqual({
      businessName: 'Acme',
      businessEmail: 'a@b.co',
      currency: 'EUR',
      timeZone: 'UTC',
    })
  })

  it('treats a draft as changed only when it really differs from what is saved', () => {
    expect(generalChanged(valid, valid)).toBe(false)
    expect(generalChanged(valid, { ...valid, businessName: `  ${valid.businessName}  ` })).toBe(false) // whitespace only
    expect(generalChanged(valid, { ...valid, businessName: 'Different' })).toBe(true)
    expect(generalChanged(valid, { ...valid, currency: 'EUR' })).toBe(true)
    expect(generalChanged(valid, { ...valid, timeZone: 'UTC' })).toBe(true)
    expect(generalChanged(valid, { ...valid, businessEmail: 'other@nexa.example' })).toBe(true)
  })
})

describe('themes', () => {
  it('lets the user pick Dark and System but not the unavailable Light', () => {
    expect(isSelectableTheme('dark')).toBe(true)
    expect(isSelectableTheme('system')).toBe(true)
    expect(isSelectableTheme('light')).toBe(false)
    expect(isSelectableTheme('purple')).toBe(false)
  })

  it('always resolves to Nexa’s dark theme', () => {
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('system')).toBe('dark')
    expect(resolveTheme('light')).toBe('dark')
    expect(resolveTheme(undefined)).toBe('dark')
  })
})

describe('small helpers', () => {
  it('reads the device time zone', () => {
    expect(getDeviceTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('makes initials for the avatar', () => {
    expect(getInitials('Jordan Ellis')).toBe('JE')
    expect(getInitials('  ada   king lovelace ')).toBe('AL')
    expect(getInitials('Prince')).toBe('PR')
    expect(getInitials('')).toBe('?')
  })
})
