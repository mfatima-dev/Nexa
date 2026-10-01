import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '../components/layout/AppShell.jsx'
import Overview from '../pages/Overview/Overview.jsx'
import Orders from '../pages/Orders/Orders.jsx'
import Customers from '../pages/Customers/Customers.jsx'
import Products from '../pages/Products/Products.jsx'
import Inventory from '../pages/Inventory/Inventory.jsx'
import Analytics from '../pages/Analytics/Analytics.jsx'
import Settings from '../pages/Settings/Settings.jsx'
import StorefrontLayout from '../pages/Storefront/StorefrontLayout.jsx'
import StorefrontHome from '../pages/Storefront/StorefrontHome.jsx'
import StorefrontShop from '../pages/Storefront/StorefrontShop.jsx'
import StorefrontProductDetail from '../pages/Storefront/StorefrontProductDetail.jsx'
import StorefrontCart from '../pages/Storefront/StorefrontCart.jsx'
import StorefrontCheckout from '../pages/Storefront/StorefrontCheckout.jsx'
import StorefrontAbout from '../pages/Storefront/StorefrontAbout.jsx'

function AppRouter() {
  return (
    <Routes>
      {/* Public entry: open the customer-facing Storefront first. */}
      <Route path="/" element={<Navigate to="/store" replace />} />

      {/* Customer-facing Storefront */}
      <Route path="/store" element={<StorefrontLayout />}>
        <Route index element={<StorefrontHome />} />
        <Route path="shop" element={<StorefrontShop />} />
        <Route path="product/:productId" element={<StorefrontProductDetail />} />
        <Route path="cart" element={<StorefrontCart />} />
        <Route path="checkout" element={<StorefrontCheckout />} />
        <Route path="about" element={<StorefrontAbout />} />
      </Route>

      {/* Admin operations app */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Overview />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default AppRouter