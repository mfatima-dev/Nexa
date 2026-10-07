import { useEffect, useState } from 'react'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { PRODUCT_CATEGORIES } from '../../data/products.js'
import { useCart } from '../../context/useCart.js'
import './StorefrontHeader.css'

const navLinkClass = ({ isActive }) => `sf-header__link${isActive ? ' sf-header__link--active' : ''}`

function CategoryLinks({ onNavigate }) {
  return (
    <>
      {PRODUCT_CATEGORIES.map((category) => (
        <NavLink
          key={category}
          to={`/store/shop?category=${encodeURIComponent(category)}`}
          className={navLinkClass}
          onClick={onNavigate}
        >
          {category}
        </NavLink>
      ))}
    </>
  )
}

function StorefrontHeader() {
  const { totalQuantity } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Closing on route change keeps the drawer from lingering after a link is followed.
  useEffect(() => {
    if (!mobileOpen) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      <header className="sf-header">
        <div className="sf-header__bar">
          <NavLink to="/store" className="sf-header__wordmark" end>
            NEXA
          </NavLink>

          <nav className="sf-header__nav" aria-label="Primary">
            <NavLink to="/store/shop" className={navLinkClass}>
              Shop
            </NavLink>
            <details className="sf-header__categories">
              <summary>Categories</summary>
              <div className="sf-header__categories-menu">
                <CategoryLinks />
              </div>
            </details>
            <NavLink to="/store/about" className={navLinkClass}>
              About
            </NavLink>
          </nav>
<div className="sf-header__actions">
  <Link to="/dashboard" className="sf-header__admin-link">
    Admin Dashboard
  </Link>
  <NavLink to="/store/cart" className="sf-header__cart" aria-label={`Cart, ${totalQuantity} items`}>
    <ShoppingBag size={19} strokeWidth={1.6} aria-hidden="true" />
    {totalQuantity > 0 && <span className="sf-header__cart-count">{totalQuantity}</span>}
  </NavLink>
  <button
    type="button"
    className="sf-header__menu-btn"
    aria-label="Open menu"
    aria-expanded={mobileOpen}
    onClick={() => setMobileOpen(true)}
  >
    <Menu size={22} strokeWidth={1.6} aria-hidden="true" />
  </button>
</div>
        </div>
      </header>

      <div className={`sf-mobile-nav${mobileOpen ? ' sf-mobile-nav--open' : ''}`}>
        <div className="sf-mobile-nav__backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        <div className="sf-mobile-nav__panel" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="sf-mobile-nav__top">
            <span className="sf-header__wordmark">NEXA</span>
            <button type="button" className="sf-header__menu-btn" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <X size={22} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
          <nav className="sf-mobile-nav__links" aria-label="Primary">
            <NavLink to="/store/shop" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Shop
            </NavLink>
            <p className="sf-mobile-nav__group-label">Categories</p>
            <CategoryLinks onNavigate={() => setMobileOpen(false)} />
            <NavLink to="/store/about" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              About
            </NavLink>
            <NavLink to="/store/cart" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Cart{totalQuantity > 0 ? ` (${totalQuantity})` : ''}
            </NavLink>
            <Link to="/dashboard" className="sf-mobile-nav__admin-link" onClick={() => setMobileOpen(false)}>
              Admin Dashboard
            </Link>
          </nav>
        </div>
      </div>
    </>
  )
}

export default StorefrontHeader
