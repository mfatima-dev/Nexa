import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductDetailImage } from '../../data/storefrontImages.js'
import { useCart } from '../../context/useCart.js'
import { useOrders } from '../../context/useOrders.js'
import { useProducts } from '../../context/useProducts.js'
import AvailabilityTag from '../../components/storefront/AvailabilityTag.jsx'
import QuantitySelector from '../../components/storefront/QuantitySelector.jsx'
import { formatCurrency } from '../../utils/format.js'
import { findSellableProduct, getAvailability, getProductDescription } from './storefrontQuery.js'
import './StorefrontProductDetail.css'

// Keyed by productId from the router below, so navigating to a different product remounts this (and
// so resets quantity/message) instead of needing an effect to reset state on prop change.
function ProductDetailView({ product, products, orders }) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  if (!product) {
    return (
      <div className="storefront__section sf-not-found">
        <h1 className="sf-section-title">This product isn’t available</h1>
        <p className="sf-not-found__copy">It may have been discontinued, or is no longer in the catalog.</p>
        <Link to="/store/shop" className="storefront__btn storefront__btn--outline">
          Back to shop
        </Link>
      </div>
    )
  }

  const available = getAvailability(product, products, orders)
  const soldOut = available <= 0

  function handleAdd() {
    const result = addItem(product.id, quantity)
    if (result.ok) setMessage(`Added ${quantity} to your cart.`)
    else if (result.available === 0) setMessage('This item just sold out.')
    else setMessage(`Only ${result.available} available — your cart now has all of it.`)
  }

  return (
    <div className="storefront__section sf-detail">
      <div className="sf-detail__media">
        <img src={getProductDetailImage(product)} alt={product.name} />
      </div>

      <div className="sf-detail__info">
        <p className="storefront__eyebrow">{product.category}</p>
        <h1 className="sf-detail__name">{product.name}</h1>
        <p className="sf-detail__price">{formatCurrency(product.price, { decimals: 2 })}</p>

        <AvailabilityTag available={available} className="sf-detail__availability" />

        <p className="sf-detail__description">{getProductDescription(product)}</p>

        <p className="sf-detail__stock-note">{soldOut ? 'Currently sold out.' : `${available} available`}</p>

        {soldOut ? (
          <button type="button" className="storefront__btn storefront__btn--primary sf-detail__add" disabled>
            Sold out
          </button>
        ) : (
          <div className="sf-detail__actions">
            <QuantitySelector quantity={quantity} max={available} onChange={setQuantity} label={`Quantity for ${product.name}`} />
            <button type="button" className="storefront__btn storefront__btn--primary sf-detail__add" onClick={handleAdd}>
              Add to cart
            </button>
          </div>
        )}

        {message && (
          <p className="sf-detail__message" role="status">
            {message}
          </p>
        )}

        <Link to="/store/cart" className="sf-detail__cart-link">
          View cart
        </Link>
      </div>
    </div>
  )
}

function StorefrontProductDetail() {
  const { productId } = useParams()
  const { products } = useProducts()
  const { orders } = useOrders()
  const product = findSellableProduct(products, productId)

  return <ProductDetailView key={productId} product={product} products={products} orders={orders} />
}

export default StorefrontProductDetail
