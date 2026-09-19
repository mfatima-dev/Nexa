import { CURRENCY_OPTIONS, THEME_OPTIONS, TIME_ZONE_OPTIONS } from './settingsDefaults.js'

export const BUSINESS_NAME_MIN = 2
export const BUSINESS_NAME_MAX = 60
export const EMAIL_MAX = 254

// Deliberately simple: something@something.tld, no spaces. Real deliverability is a backend concern.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const text = (value) => (typeof value === 'string' ? value.trim() : '')

/** Validation for the General form. Returns { field: message }; an empty object means valid. */
export function validateGeneral(values) {
  const errors = {}

  const name = text(values.businessName)
  if (!name) errors.businessName = 'Enter your business name.'
  else if (name.length < BUSINESS_NAME_MIN) errors.businessName = `Business name must be at least ${BUSINESS_NAME_MIN} characters.`
  else if (name.length > BUSINESS_NAME_MAX) errors.businessName = `Business name must be ${BUSINESS_NAME_MAX} characters or fewer.`

  const email = text(values.businessEmail)
  if (!email) errors.businessEmail = 'Enter a business email address.'
  else if (email.length > EMAIL_MAX) errors.businessEmail = `Email address must be ${EMAIL_MAX} characters or fewer.`
  else if (!EMAIL_PATTERN.test(email)) errors.businessEmail = 'Enter a valid email address, like name@company.com.'

  if (!CURRENCY_OPTIONS.some((option) => option.value === values.currency)) errors.currency = 'Choose a currency from the list.'
  if (!TIME_ZONE_OPTIONS.some((option) => option.value === values.timeZone)) errors.timeZone = 'Choose a time zone from the list.'

  return errors
}

/** What actually gets stored: surrounding whitespace removed. */
export function normalizeGeneral(values) {
  return {
    businessName: text(values.businessName),
    businessEmail: text(values.businessEmail),
    currency: values.currency,
    timeZone: values.timeZone,
  }
}

/** Whether the form differs from what is saved, ignoring stray whitespace. */
export function generalChanged(saved, draft) {
  const next = normalizeGeneral(draft)
  return Object.keys(next).some((field) => next[field] !== saved[field])
}

/** A theme the user may pick: it exists, and isn't marked unavailable. */
export function isSelectableTheme(theme) {
  return THEME_OPTIONS.some((option) => option.value === theme && !option.disabled)
}

// Nexa has one theme, so each preference resolves to it. When a second theme exists, "system" is
// where the device's colour-scheme preference would be read.
const RESOLVED_THEMES = { dark: 'dark', system: 'dark' }

/** The theme actually applied for a preference. Anything unknown falls back to Nexa's default. */
export function resolveTheme(theme) {
  return RESOLVED_THEMES[theme] ?? 'dark'
}

/** The time zone this device is set to, which Nexa's pages currently use for every date. */
export function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Two-letter initials for an avatar: "Jordan Ellis" -> "JE". */
export function getInitials(name) {
  const parts = text(name).split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
