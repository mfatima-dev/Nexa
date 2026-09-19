import { useState } from 'react'
import { useSettings } from '../../context/useSettings.js'
import { THEME_OPTIONS } from '../../data/settingsDefaults.js'
import ToggleSwitch from '../common/ToggleSwitch.jsx'
import './AppearanceSettings.css'

/**
 * Theme and motion. Nexa has one visual design, dark, so the theme choice never restyles the app:
 * "System" resolves to dark and "Light" is shown but unavailable. Reduce motion is a real switch
 * that turns off interface transitions (see styles/preferences.css).
 */
function AppearanceSettings() {
  const { settings, setAppearance } = useSettings()
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
        {THEME_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`appearance-settings__theme${theme === option.value ? ' appearance-settings__theme--active' : ''}${
              option.disabled ? ' appearance-settings__theme--disabled' : ''
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              disabled={option.disabled}
              onChange={() => handleTheme(option)}
            />
            <span className="appearance-settings__theme-label">{option.label}</span>
            <span className="appearance-settings__theme-hint">{option.hint}</span>
          </label>
        ))}
      </fieldset>

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
