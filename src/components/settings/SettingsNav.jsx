import './SettingsNav.css'

/** "On this page" jump links. Each link scrolls to its section and moves focus there. */
function SettingsNav({ sections }) {
  function jumpTo(event, id) {
    const target = document.getElementById(id)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ block: 'start' })
    target.focus({ preventScroll: true })
  }

  return (
    <nav className="settings-nav" aria-label="Settings sections">
      <ul className="settings-nav__list">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`settings-nav__link${section.danger ? ' settings-nav__link--danger' : ''}`}
              onClick={(event) => jumpTo(event, section.id)}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default SettingsNav
