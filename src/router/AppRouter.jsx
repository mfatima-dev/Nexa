import { Route, Routes } from 'react-router-dom'
import AppShell from '../components/layout/AppShell.jsx'
import Overview from '../pages/Overview/Overview.jsx'
import Orders from '../pages/Orders/Orders.jsx'
import Customers from '../pages/Customers/Customers.jsx'
import Products from '../pages/Products/Products.jsx'
import Inventory from '../pages/Inventory/Inventory.jsx'
import Analytics from '../pages/Analytics/Analytics.jsx'
import Settings from '../pages/Settings/Settings.jsx'

function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="products" element={<Products />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default AppRouter
