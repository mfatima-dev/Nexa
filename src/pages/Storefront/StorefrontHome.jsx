import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PRODUCT_CATEGORIES } from '../../data/products.js'
import { heroImage } from '../../data/storefrontImages.js'
import { useOrders } from '../../context/useOrders.js'
import { useProducts } from '../../context/useProducts.js'
import ProductCard from '../../components/storefront/ProductCard.jsx'
import CategoryCard from '../../components/storefront/CategoryCard.jsx'
import { getAvailability, getFeaturedProducts, getProductsByCategory } from './storefrontQuery.js'
import './StorefrontHome.css'

function StorefrontHome() {
  const { products } = useProducts()
  const { orders } = useOrders()

  const featured = useMemo(() => getFeaturedProducts(products, 6), [products])
  const categoryCounts = useMemo(
    () => Object.fromEntries(PRODUCT_CATEGORIES.map((category) => [category, getProductsByCategory(products, category).length])),
    [products],
  )

  return (
    <div>
      <section className="sf-hero">
        <img src={heroImage()} alt="" className="sf-hero__image" />
        <div className="sf-hero__scrim" aria-hidden="true" />
        <div className="sf-hero__content">
          <span className="storefront__eyebrow storefront__eyebrow--light">New season</span>
          <h1 className="sf-hero__headline">Carry it well.</h1>
          <p className="sf-hero__subhead">
            Bags, travel and everyday tech essentials, built from considered materials and made to last.
          </p>
          <Link to="/store/shop" className="storefront__btn storefront__btn--primary sf-hero__cta">
            Shop now
          </Link>
        </div>
      </section>

      <section className="storefront__section">
        <div className="sf-section-heading">
          <div>
            <span className="storefront__eyebrow">Featured</span>
            <h2 className="sf-section-title">This season’s edit</h2>
          </div>
          <Link to="/store/shop" className="sf-section-link">
            View all
          </Link>
        </div>
        <div className="sf-product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} available={getAvailability(product, products, orders)} />
          ))}
        </div>
      </section>

      <section className="storefront__section">
        <div className="sf-section-heading">
          <div>
            <span className="storefront__eyebrow">Collections</span>
            <h2 className="sf-section-title">Shop by category</h2>
          </div>
        </div>
        <div className="sf-category-grid">
          {PRODUCT_CATEGORIES.map((category) => (
            <CategoryCard key={category} category={category} count={categoryCounts[category]} />
          ))}
        </div>
      </section>

      <section className="sf-about-teaser storefront__section">
        <div className="sf-about-teaser__text">
          <span className="storefront__eyebrow">Our approach</span>
          <h2 className="sf-section-title">Built for daily use, not display.</h2>
          <p className="sf-about-teaser__copy">
            Every Nexa piece is chosen for how it holds up — the way it wears in, the details you notice
            after a year, not a day.
          </p>
          <Link to="/store/about" className="storefront__btn storefront__btn--outline">
            About Nexa
          </Link>
        </div>
      </section>
    </div>
  )
}

export default StorefrontHome
