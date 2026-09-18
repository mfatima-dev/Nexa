import { NavLink } from 'react-router-dom'

function SidebarNavItem({ to, icon: Icon, label, end = false, onClick }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        onClick={onClick}
        className={({ isActive }) =>
          `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
        }
      >
        <Icon size={18} className="sidebar__nav-icon" aria-hidden="true" />
        <span>{label}</span>
      </NavLink>
    </li>
  )
}

export default SidebarNavItem
