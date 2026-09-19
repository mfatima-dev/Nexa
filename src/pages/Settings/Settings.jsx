import { Info } from 'lucide-react'
import AccountSettings from '../../components/settings/AccountSettings.jsx'
import AppearanceSettings from '../../components/settings/AppearanceSettings.jsx'
import DangerZone from '../../components/settings/DangerZone.jsx'
import GeneralSettings from '../../components/settings/GeneralSettings.jsx'
import NotificationSettings from '../../components/settings/NotificationSettings.jsx'
import SettingsNav from '../../components/settings/SettingsNav.jsx'
import SettingsSection from '../../components/settings/SettingsSection.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import './Settings.css'

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'account', label: 'Account' },
  { id: 'danger-zone', label: 'Danger zone', danger: true },
]

function Settings() {
  return (
    <div className="settings">
      <PageHeader title="Settings" description="Manage your business details, notifications and preferences." />

      <p className="settings__session-note">
        <Info size={16} aria-hidden="true" />
        <span>
          Your theme is remembered in this browser. Other changes apply to this session only: Nexa doesn’t save business data yet,
          so they return to their defaults when you reload the page.
        </span>
      </p>

      <div className="settings__layout">
        <SettingsNav sections={SECTIONS} />

        <div className="settings__sections">
          <SettingsSection id="general" title="General" subtitle="Your business details and regional preferences">
            <GeneralSettings />
          </SettingsSection>

          <SettingsSection id="notifications" title="Notifications" subtitle="Choose what Nexa tells you about">
            <NotificationSettings />
          </SettingsSection>

          <SettingsSection id="appearance" title="Appearance" subtitle="How Nexa looks and moves">
            <AppearanceSettings />
          </SettingsSection>

          <SettingsSection id="account" title="Account" subtitle="The admin profile and this session">
            <AccountSettings />
          </SettingsSection>

          <SettingsSection
            id="danger-zone"
            title="Danger zone"
            subtitle="Irreversible actions"
            className="settings__danger"
          >
            <DangerZone />
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}

export default Settings
