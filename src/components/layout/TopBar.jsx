import { Bell, Menu, Search, User } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import IconButton from '../common/IconButton.jsx'
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from './navItems.js'
import './TopBar.css'

const ALL_NAV_ITEMS = [...NAV_ITEMS, ...SECONDARY_NAV_ITEMS]

function getPageTitle(pathname) {
  const match = ALL_NAV_ITEMS.find((item) =>
    item.path === '/' ? pathname === '/' : pathname.startsWith(item.path),
  )
  return match?.label ?? 'Overview'
}

function TopBar({ onMenuClick }) {
  const { pathname } = useLocation()

  return (
    <header className="topbar">
      <div className="topbar__left">
        <IconButton
          icon={Menu}
          label="Open navigation"
          onClick={onMenuClick}
          variant="outline"
          className="topbar__menu-btn"
        />
        <h1 className="topbar__title">{getPageTitle(pathname)}</h1>
      </div>

      <div className="topbar__right">
        <label className="topbar__search">
          <Search size={16} className="topbar__search-icon" aria-hidden="true" />
          <input type="search" placeholder="Search orders, customers, products…" aria-label="Search" />
        </label>

        <IconButton icon={Bell} label="Notifications" variant="outline" />

        <button type="button" className="topbar__user" aria-label="Account menu">
          <span className="topbar__avatar" aria-hidden="true">
            <User size={16} />
          </span>
          <span className="topbar__user-name">Account</span>
        </button>
      </div>
    </header>
  )
}

export default TopBar
