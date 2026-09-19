import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ADMIN_ACCOUNT, DEFAULT_SETTINGS } from '../data/settingsDefaults.js'
import { isSelectableTheme, normalizeGeneral, resolveTheme, validateGeneral } from '../data/settingsRules.js'
import { SettingsContext } from './settingsContextInstance.js'
import '../styles/preferences.css'

/**
 * Session-local settings for the workspace, kept apart from every business dataset.
 *
 * Nothing is persisted: a reload returns to `initialSettings`. To add persistence later, load saved
 * settings into `initialSettings` and save from `onChange`, which receives the complete settings
 * object after every successful change. The Settings UI does not need to change.
 */
export function SettingsProvider({ children, initialSettings = DEFAULT_SETTINGS, onChange }) {
  const [settings, setSettings] = useState(initialSettings)
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

  /** patch: { theme?, reduceMotion? }. An unavailable theme (e.g. Light) is refused. */
  const setAppearance = useCallback(
    (patch) => {
      const current = settingsRef.current
      if ('theme' in patch && !isSelectableTheme(patch.theme)) return { ok: false }
      if ('reduceMotion' in patch && typeof patch.reduceMotion !== 'boolean') return { ok: false }

      commit({ ...current, appearance: { ...current.appearance, ...patch } })
      return { ok: true }
    },
    [commit],
  )

  // Apply the appearance preferences to the document, where the stylesheet reads them.
  const { theme, reduceMotion } = settings.appearance
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolveTheme(theme)
    root.dataset.reduceMotion = String(reduceMotion)
    return () => {
      delete root.dataset.theme
      delete root.dataset.reduceMotion
    }
  }, [theme, reduceMotion])

  const value = useMemo(
    () => ({ settings, account: ADMIN_ACCOUNT, session, saveGeneral, setNotification, setAppearance }),
    [settings, session, saveGeneral, setNotification, setAppearance],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
