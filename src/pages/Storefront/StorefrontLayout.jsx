import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import StorefrontFooter from '../../components/storefront/StorefrontFooter.jsx'
import StorefrontHeader from '../../components/storefront/StorefrontHeader.jsx'
import { CartProvider } from '../../context/CartContext.jsx'
import './storefront-tokens.css'
import './StorefrontLayout.css'

/**
 * The customer-facing Storefront. It sits beside the admin app, sharing the same Products, Orders and
 * Customers state (so a Storefront order shows up in the admin immediately) but with its own header,
 * footer and visual identity — no admin sidebar or top bar. `CartProvider` is scoped to this layout,
 * so the cart is gone as soon as you leave `/store/*`; Nexa has no persistence yet.
 */
function StorefrontLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <CartProvider>
      <div className="storefront">
        <StorefrontHeader />
        <main className="storefront__main">
          <Outlet />
        </main>
        <StorefrontFooter />
      </div>
    </CartProvider>
  )
}

export default StorefrontLayout
