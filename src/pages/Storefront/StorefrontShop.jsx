import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PRODUCT_CATEGORIES } from '../../data/products.js'
import { useOrders } from '../../context/useOrders.js'
import { useProducts } from '../../context/useProducts.js'
import ProductCard from '../../components/storefront/ProductCard.jsx'
import { getAvailability, getSellableProducts } from './storefrontQuery.js'
import './StorefrontShop.css'

function StorefrontShop() {
  const { products } = useProducts()
  const { orders } = useOrders()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = PRODUCT_CATEGORIES.includes(searchParams.get('category')) ? searchParams.get('category') : null

  const sellable = useMemo(() => getSellableProducts(products), [products])
  const shown = useMemo(
    () => (activeCategory ? sellable.filter((product) => product.category === activeCategory) : sellable),
    [sellable, activeCategory],
  )

  function selectCategory(category) {
    setSearchParams(category ? { category } : {})
  }

  return (
    <div className="storefront__section">
      <div className="sf-shop-heading">
        <span className="storefront__eyebrow">Shop</span>
        <h1 className="sf-section-title">{activeCategory ?? 'All products'}</h1>
      </div>

      <div className="sf-filter-row" role="group" aria-label="Filter by category">
        <button type="button" className={`sf-chip${!activeCategory ? ' sf-chip--active' : ''}`} onClick={() => selectCategory(null)}>
          All
        </button>
        {PRODUCT_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={`sf-chip${activeCategory === category ? ' sf-chip--active' : ''}`}
            onClick={() => selectCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {shown.length > 0 ? (
        <div className="sf-product-grid">
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} available={getAvailability(product, products, orders)} />
          ))}
        </div>
      ) : (
        <p className="sf-empty">Nothing in this collection right now — check back soon.</p>
      )}
    </div>
  )
}

export default StorefrontShop
