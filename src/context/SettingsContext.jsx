import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ADMIN_ACCOUNT, DEFAULT_SETTINGS } from '../data/settingsDefaults.js'
import { isSelectableTheme, normalizeGeneral, resolveTheme, validateGeneral } from '../data/settingsRules.js'
import { readStoredTheme, subscribeToSystemTheme, systemPrefersLight, writeStoredTheme } from '../data/themePreference.js'
import { SettingsContext } from './settingsContextInstance.js'
import '../styles/preferences.css'

// The theme is the one setting that survives a reload (see themePreference.js); a saved choice wins
// over the starting settings.
function withStoredTheme(settings) {
  const stored = readStoredTheme()
  return stored ? { ...settings, appearance: { ...settings.appearance, theme: stored } } : settings
}

/**
 * Settings for the workspace, kept apart from every business dataset.
 *
 * Only the theme choice is remembered between visits (in this browser's localStorage). Everything
 * else returns to `initialSettings` on reload, because Nexa has no backend to save it to. To add
 * persistence later, load saved settings into `initialSettings` and save from `onChange`, which
 * receives the complete settings object after every successful change. The Settings UI does not
 * need to change.
 */
export function SettingsProvider({ children, initialSettings = DEFAULT_SETTINGS, onChange }) {
  const [settings, setSettings] = useState(() => withStoredTheme(initialSettings))
  // When this browser session began, shown in the Account section.
  const [session] = useState(() => ({ startedAt: new Date().toISOString(), mode: 'demo' }))

  const settingsRef = useRef(settings)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  })

  const commit = useCallback((next) => {
    settingsRef.current = next
    setSettings(next)
    onChangeRef.current?.(next)
  }, [])

  /** Validates and saves the General form. Returns { ok, errors } so the form can show what's wrong. */
  const saveGeneral = useCallback(
    (values) => {
      const errors = validateGeneral(values)
      if (Object.keys(errors).length > 0) return { ok: false, errors }

      commit({ ...settingsRef.current, general: normalizeGeneral(values) })
      return { ok: true, errors: {} }
    },
    [commit],
  )

  const setNotification = useCallback(
    (key, enabled) => {
      const current = settingsRef.current
      if (!(key in current.notifications) || typeof enabled !== 'boolean') return { ok: false }
      if (current.notifications[key] === enabled) return { ok: true }

      commit({ ...current, notifications: { ...current.notifications, [key]: enabled } })
      return { ok: true }
    },
    [commit],
  )

  /** patch: { theme?, reduceMotion? }. An unknown theme is refused; a valid one is remembered. */
  const setAppearance = useCallback(
    (patch) => {
      const current = settingsRef.current
      if ('theme' in patch && !isSelectableTheme(patch.theme)) return { ok: false }
      if ('reduceMotion' in patch && typeof patch.reduceMotion !== 'boolean') return { ok: false }

      if ('theme' in patch) writeStoredTheme(patch.theme)
      commit({ ...current, appearance: { ...current.appearance, ...patch } })
      return { ok: true }
    },
    [commit],
  )

  // The device's light/dark setting, live. It is always tracked but only used while "System" is chosen,
  // so following the device never locks Nexa to either theme.
  const deviceIsLight = useSyncExternalStore(subscribeToSystemTheme, systemPrefersLight)
  const { theme, reduceMotion } = settings.appearance
  const resolvedTheme = resolveTheme(theme, deviceIsLight)

  // Apply the appearance preferences to the document, where the stylesheets read them. They are
  // only removed when the provider itself goes away, so a theme change never flashes an unstyled page.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    root.dataset.reduceMotion = String(reduceMotion)
  }, [resolvedTheme, reduceMotion])

  useEffect(
    () => () => {
      delete document.documentElement.dataset.theme
      delete document.documentElement.dataset.reduceMotion
    },
    [],
  )

  const value = useMemo(
    () => ({ settings, resolvedTheme, account: ADMIN_ACCOUNT, session, saveGeneral, setNotification, setAppearance }),
    [settings, resolvedTheme, session, saveGeneral, setNotification, setAppearance],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
