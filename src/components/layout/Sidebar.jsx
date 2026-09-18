import { X } from 'lucide-react'
import IconButton from '../common/IconButton.jsx'
import SidebarNavItem from './SidebarNavItem.jsx'
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from './navItems.js'
import './Sidebar.css'

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div
        className={`sidebar__backdrop${isOpen ? ' sidebar__backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">NEXA</span>
            <span className="sidebar__brand-label">BUSINESS OPERATIONS</span>
          </div>
          <IconButton
            icon={X}
            label="Close navigation"
            onClick={onClose}
            className="sidebar__close"
          />
        </div>

        <nav className="sidebar__nav" aria-label="Primary">
          <ul className="sidebar__nav-list">
            {NAV_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                end={item.path === '/'}
                onClick={onClose}
              />
            ))}
          </ul>
        </nav>

        <nav className="sidebar__nav sidebar__nav--secondary" aria-label="Secondary">
          <ul className="sidebar__nav-list">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                onClick={onClose}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
