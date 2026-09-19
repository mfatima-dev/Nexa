import { useState } from 'react'
import { Check } from 'lucide-react'
import { useSettings } from '../../context/useSettings.js'
import { THEME_OPTIONS } from '../../data/settingsDefaults.js'
import ToggleSwitch from '../common/ToggleSwitch.jsx'
import './AppearanceSettings.css'

const THEME_NAMES = { dark: 'Dark', light: 'Light' }

/**
 * Theme and motion. Dark, Light and System are all live: choosing one restyles Nexa at once, and
 * the choice is remembered in this browser. "System" follows the device's light or dark setting and
 * keeps following it. The chosen card is marked with a check as well as colour. Reduce motion is a
 * separate switch that turns off interface transitions (see styles/preferences.css).
 */
function AppearanceSettings() {
  const { settings, resolvedTheme, setAppearance } = useSettings()
  const { theme, reduceMotion } = settings.appearance
  const [announcement, setAnnouncement] = useState('')

  function handleTheme(option) {
    if (!setAppearance({ theme: option.value }).ok) return
    setAnnouncement(`Theme set to ${option.label}.`)
  }

  function handleReduceMotion(enabled) {
    if (!setAppearance({ reduceMotion: enabled }).ok) return
    setAnnouncement(`Reduce motion turned ${enabled ? 'on' : 'off'}.`)
  }

  return (
    <div className="appearance-settings">
      <fieldset className="appearance-settings__themes">
        <legend>Theme</legend>
        {THEME_OPTIONS.map((option) => {
          const selected = theme === option.value
          return (
            <label key={option.value} className={`appearance-settings__theme${selected ? ' appearance-settings__theme--active' : ''}`}>
              <input type="radio" name="theme" value={option.value} checked={selected} onChange={() => handleTheme(option)} />
              <span className="appearance-settings__theme-label">
                {option.label}
                {selected && <Check size={14} className="appearance-settings__check" aria-hidden="true" />}
              </span>
              <span className="appearance-settings__theme-hint">{option.hint}</span>
            </label>
          )
        })}
      </fieldset>

      {/* Polite live region: also announces the change when "System" follows the device on its own. */}
      <p className="appearance-settings__current" aria-live="polite">
        Showing the {THEME_NAMES[resolvedTheme]} theme{theme === 'system' ? ', following your device' : ''}.
      </p>

      <div className="appearance-settings__motion">
        <ToggleSwitch
          label="Reduce motion"
          description="Turns off hover and panel transitions across the interface. Nexa also follows your device’s reduce-motion setting."
          checked={reduceMotion}
          onChange={handleReduceMotion}
        />
      </div>

      <p className="appearance-settings__status" role="status">
        {announcement}
      </p>
    </div>
  )
}

export default AppearanceSettings
