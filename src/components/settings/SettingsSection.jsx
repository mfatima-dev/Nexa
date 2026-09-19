import SectionCard from '../common/SectionCard.jsx'
import './SettingsSection.css'

/**
 * One block of the Settings page. It is a jump target for the section nav, so it has an id and can
 * take focus (tabIndex -1: focusable by script, not part of the Tab order).
 */
function SettingsSection({ id, title, subtitle, className = '', children }) {
  return (
    <div id={id} tabIndex={-1} className="settings-section">
      <SectionCard title={title} subtitle={subtitle} className={className}>
        {children}
      </SectionCard>
    </div>
  )
}

export default SettingsSection
