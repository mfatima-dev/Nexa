import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'
import './AppShell.css'

function AppShell() {
  const [isNavOpen, setIsNavOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} />
      <div className="app-shell__main">
        <TopBar onMenuClick={() => setIsNavOpen(true)} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell
