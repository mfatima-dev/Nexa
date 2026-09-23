import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { getProductImage } from '../../data/storefrontImages.js'
import { useCart } from '../../context/useCart.js'
import { formatCurrency } from '../../utils/format.js'
import AvailabilityTag from './AvailabilityTag.jsx'
import { getAvailabilityState } from './availabilityState.js'
import './ProductCard.css'

/** A product card used on Home, Shop and search results: image, category, name, price, availability,
 * and a one-tap add to cart that doesn't require opening the product page. */
function ProductCard({ product, available }) {
  const { addItem } = useCart()
  const [justAdded, setJustAdded] = useState(false)
  const soldOut = getAvailabilityState(available) === 'out'

  function handleAdd(event) {
    event.preventDefault()
    const result = addItem(product.id, 1)
    if (result.ok) {
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 1600)
    }
  }

  return (
    <article className="sf-card">
      <Link to={`/store/product/${product.id}`} className="sf-card__media-link" aria-label={product.name}>
        <div className="sf-card__media">
          <img src={getProductImage(product)} alt="" loading="lazy" className="sf-card__image" />
          <AvailabilityTag available={available} className="sf-card__availability" />
        </div>
      </Link>

      <div className="sf-card__body">
        <div className="sf-card__info">
          <p className="sf-card__category">{product.category}</p>
          <Link to={`/store/product/${product.id}`} className="sf-card__name-link">
            <h3 className="sf-card__name">{product.name}</h3>
          </Link>
          <p className="sf-card__price">{formatCurrency(product.price, { decimals: 2 })}</p>
        </div>

        <button
          type="button"
          className={`sf-card__add${justAdded ? ' sf-card__add--done' : ''}`}
          onClick={handleAdd}
          disabled={soldOut}
          aria-label={`Add ${product.name} to cart`}
        >
          {justAdded ? 'Added' : soldOut ? 'Sold out' : <Plus size={17} strokeWidth={1.8} aria-hidden="true" />}
        </button>
      </div>
    </article>
  )
}

export default ProductCard
