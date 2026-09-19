import { Info } from 'lucide-react'
import { useSettings } from '../../context/useSettings.js'
import { getInitials } from '../../data/settingsRules.js'
import { formatDate } from '../../utils/date.js'
import './AccountSettings.css'

/** The signed-in admin and this browser session. Read-only, and honest that it is a frontend demo. */
function AccountSettings() {
  const { settings, account, session } = useSettings()

  const details = [
    ['Email', account.email],
    ['Role', account.role],
    ['Access', account.access],
    ['Workspace', settings.general.businessName],
    // A calendar date, not a moment: formatted in UTC so it reads the same in every time zone.
    ['Member since', formatDate(account.memberSince, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })],
  ]
  const sessionDetails = [
    ['Session type', 'Demo session (frontend only)'],
    ['Session started', formatDate(session.startedAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })],
    ['Data storage', 'In memory only. Cleared when you reload the page.'],
  ]

  return (
    <div className="account-settings">
      <div className="account-settings__profile">
        <span className="account-settings__avatar" aria-hidden="true">
          {getInitials(account.name)}
        </span>
        <div className="account-settings__identity">
          <p className="account-settings__name">{account.name}</p>
          <span className="account-settings__role">{account.role}</span>
        </div>
      </div>

      <dl className="account-settings__details" aria-label="Profile">
        {details.map(([term, description]) => (
          <div key={term} className="account-settings__detail">
            <dt>{term}</dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>

      <h3 className="account-settings__subheading">Session</h3>
      <dl className="account-settings__details" aria-label="Session">
        {sessionDetails.map(([term, description]) => (
          <div key={term} className="account-settings__detail">
            <dt>{term}</dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>

      <p className="account-settings__note">
        <Info size={16} aria-hidden="true" />
        <span>
          This is a demo account. Signing in, passwords and team roles need a backend, which Nexa doesn’t have yet.
        </span>
      </p>
    </div>
  )
}

export default AccountSettings
