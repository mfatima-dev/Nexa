/**
 * The theme choice ("dark", "light" or "system") is the one setting Nexa remembers between visits,
 * in this browser's localStorage. That is a display preference, not business data: nothing else is
 * stored, and there is no backend. Every browser API used here can be missing or blocked (private
 * windows, old browsers, tests), so each is guarded and falls back to Nexa's default, dark.
 *
 * index.html repeats the read below in a few lines so the right theme is applied before the first
 * paint. Keep the two in step (a test checks that they agree).
 */

export const THEME_STORAGE_KEY = 'nexa-theme'
export const THEME_CHOICES = ['dark', 'light', 'system']
export const DEFAULT_THEME_CHOICE = 'dark'

// "System" follows the operating system. Only an explicit "light" preference switches to Light;
// anything else (dark, no preference, or no support) stays on Nexa's default.
export const SYSTEM_LIGHT_QUERY = '(prefers-color-scheme: light)'

function getStorage() {
  try {
    return window.localStorage
  } catch {
    return null // access itself can throw when storage is blocked
  }
}

/** The saved choice, or null when nothing valid is saved (or storage is unavailable). */
export function readStoredTheme(storage = getStorage()) {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY)
    return THEME_CHOICES.includes(value) ? value : null
  } catch {
    return null
  }
}

/** Saves the choice. Returns false when it could not be saved (the theme still applies this session). */
export function writeStoredTheme(theme, storage = getStorage()) {
  if (!THEME_CHOICES.includes(theme)) return false
  try {
    storage.setItem(THEME_STORAGE_KEY, theme)
    return true
  } catch {
    return false
  }
}

/** The media query for the OS light preference, or null where matchMedia isn't supported. */
export function getSystemLightQuery() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(SYSTEM_LIGHT_QUERY) : null
}

/** Whether the operating system currently asks for a light appearance. */
export function systemPrefersLight() {
  return getSystemLightQuery()?.matches ?? false
}

/** Calls `onChange` whenever the OS preference changes. Returns the function that stops listening. */
export function subscribeToSystemTheme(onChange) {
  const query = getSystemLightQuery()
  if (!query) return () => {}

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }
  query.addListener?.(onChange) // older Safari
  return () => query.removeListener?.(onChange)
}
