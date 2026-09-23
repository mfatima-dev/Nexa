import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { getProductImage } from '../../data/storefrontImages.js'
import { useCart } from '../../context/useCart.js'
import QuantitySelector from '../../components/storefront/QuantitySelector.jsx'
import { formatCurrency } from '../../utils/format.js'
import './StorefrontCart.css'

function StorefrontCart() {
  const { items, subtotal, setQuantity, removeItem } = useCart()

  if (items.length === 0) {
    return (
      <div className="storefront__section sf-cart-empty">
        <h1 className="sf-section-title">Your cart is empty</h1>
        <p className="sf-cart-empty__copy">Nothing here yet — browse the shop to find something for your next trip.</p>
        <Link to="/store/shop" className="storefront__btn storefront__btn--primary">
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="storefront__section sf-cart">
      <h1 className="sf-section-title sf-cart__title">Your cart</h1>
      <div className="sf-cart__layout">
        <ul className="sf-cart__lines">
          {items.map((item) => (
            <li key={item.product.id} className="sf-cart__line">
              <Link to={`/store/product/${item.product.id}`} className="sf-cart__line-media">
                <img src={getProductImage(item.product)} alt="" />
              </Link>

              <div className="sf-cart__line-info">
                <Link to={`/store/product/${item.product.id}`} className="sf-cart__line-name">
                  {item.product.name}
                </Link>
                <p className="sf-cart__line-category">{item.product.category}</p>
                <p className="sf-cart__line-unit">{formatCurrency(item.product.price, { decimals: 2 })} each</p>
                <button
                  type="button"
                  className="sf-cart__line-remove"
                  onClick={() => removeItem(item.product.id)}
                  aria-label={`Remove ${item.product.name} from cart`}
                >
                  <X size={13} strokeWidth={2} aria-hidden="true" />
                  Remove
                </button>
              </div>

              <div className="sf-cart__line-controls">
                <QuantitySelector
                  quantity={item.quantity}
                  max={item.available}
                  onChange={(quantity) => setQuantity(item.product.id, quantity)}
                  label={`Quantity for ${item.product.name}`}
                />
                <p className="sf-cart__line-price">{formatCurrency(item.lineTotal, { decimals: 2 })}</p>
              </div>
            </li>
          ))}
        </ul>

        <aside className="sf-cart__summary">
          <div className="sf-cart__summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, { decimals: 2 })}</span>
          </div>
          <p className="sf-cart__summary-note">Shipping and taxes are calculated at checkout.</p>
          <Link to="/store/checkout" className="storefront__btn storefront__btn--primary storefront__btn--full">
            Checkout
          </Link>
          <Link to="/store/shop" className="sf-cart__continue">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  )
}

export default StorefrontCart
