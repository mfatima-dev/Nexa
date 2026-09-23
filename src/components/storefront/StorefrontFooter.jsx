import { Link } from 'react-router-dom'
import { PRODUCT_CATEGORIES } from '../../data/products.js'
import './StorefrontFooter.css'

function StorefrontFooter() {
  return (
    <footer className="sf-footer">
      <div className="sf-footer__inner">
        <div className="sf-footer__brand">
          <span className="sf-header__wordmark">NEXA</span>
          <p className="sf-footer__tagline">Considered goods for everyday carry and travel.</p>
        </div>

        <div className="sf-footer__col">
          <p className="sf-footer__heading">Shop</p>
          {PRODUCT_CATEGORIES.map((category) => (
            <Link key={category} to={`/store/shop?category=${encodeURIComponent(category)}`} className="sf-footer__link">
              {category}
            </Link>
          ))}
        </div>

        <div className="sf-footer__col">
          <p className="sf-footer__heading">Nexa</p>
          <Link to="/store/about" className="sf-footer__link">
            About
          </Link>
          <Link to="/store/shop" className="sf-footer__link">
            All products
          </Link>
          <Link to="/store/cart" className="sf-footer__link">
            Cart
          </Link>
        </div>
      </div>
      <div className="sf-footer__bottom">
        <p>© {new Date().getFullYear()} Nexa. A demonstration storefront — no orders are shipped.</p>
      </div>
    </footer>
  )
}

export default StorefrontFooter
