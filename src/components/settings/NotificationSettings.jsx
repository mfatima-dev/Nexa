import { useState } from 'react'
import { useSettings } from '../../context/useSettings.js'
import { NOTIFICATION_OPTIONS } from '../../data/settingsDefaults.js'
import ToggleSwitch from '../common/ToggleSwitch.jsx'
import './NotificationSettings.css'

/** What Nexa should tell you about. Each switch applies immediately, for this session. */
function NotificationSettings() {
  const { settings, setNotification } = useSettings()
  const [announcement, setAnnouncement] = useState('')

  function handleToggle(option, enabled) {
    if (!setNotification(option.key, enabled).ok) return
    setAnnouncement(`${option.label} turned ${enabled ? 'on' : 'off'}.`)
  }

  return (
    <div className="notification-settings">
      <div className="notification-settings__list" role="group" aria-label="Notification preferences">
        {NOTIFICATION_OPTIONS.map((option) => (
          <ToggleSwitch
            key={option.key}
            label={option.label}
            description={
              option.key === 'email'
                ? `Also send notifications by email to ${settings.general.businessEmail}.`
                : option.description
            }
            checked={settings.notifications[option.key]}
            onChange={(enabled) => handleToggle(option, enabled)}
          />
        ))}
      </div>

      <p className="notification-settings__note">
        Preferences apply to this session. Nexa doesn’t deliver alerts or send email yet.
      </p>
      <p className="notification-settings__status" role="status">
        {announcement}
      </p>
    </div>
  )
}

export default NotificationSettings
