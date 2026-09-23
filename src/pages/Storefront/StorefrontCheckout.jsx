import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useCart } from '../../context/useCart.js'
import { useCustomers } from '../../context/useCustomers.js'
import { useOrders } from '../../context/useOrders.js'
import { formatCurrency } from '../../utils/format.js'
import './StorefrontCheckout.css'

const EMPTY_VALUES = { name: '', email: '', phone: '', street: '', city: '', state: '', zip: '' }

const FIELDS = [
  { name: 'name', label: 'Full name', autoComplete: 'name', span: 2 },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', span: 2 },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', span: 2 },
  { name: 'street', label: 'Street address', autoComplete: 'address-line1', span: 2 },
  { name: 'city', label: 'City', autoComplete: 'address-level2', span: 1 },
  { name: 'state', label: 'State', autoComplete: 'address-level1', span: 1 },
  { name: 'zip', label: 'ZIP code', autoComplete: 'postal-code', span: 1 },
]

// A friendly summary of why placeOrder refused the order, built from its own error shape — no rule
// is re-implemented here, only its messages are read and matched back to the cart line they concern.
function describeOrderError(errors, items) {
  if (errors?.lines) {
    const lineMessages = errors.lines
      .map((lineError, index) => {
        if (!lineError) return null
        const name = items[index]?.product.name ?? 'An item'
        return `${name}: ${lineError.quantity ?? lineError.productId}`
      })
      .filter(Boolean)
    if (lineMessages.length > 0) {
      return `Your cart changed before checkout — ${lineMessages.join('; ')}. Update your cart and try again.`
    }
  }
  if (errors?.items) return `Your cart is empty — ${errors.items}`
  if (errors?.customerId) return 'We couldn’t confirm your account. Please try again.'
  return 'We couldn’t complete your order. Please try again.'
}

function ConfirmationView({ order, customer, itemCount }) {
  return (
    <div className="storefront__section sf-confirmation">
      <span className="sf-confirmation__icon" aria-hidden="true">
        <Check size={26} strokeWidth={2.2} />
      </span>
      <h1 className="sf-section-title">Order confirmed</h1>
      <p className="sf-confirmation__copy">
        Thanks, {customer.name.split(' ')[0]} — order <strong>{order.id}</strong> is in. We’ll send updates to {customer.email}.
      </p>
      <dl className="sf-confirmation__facts">
        <div>
          <dt>Order number</dt>
          <dd>{order.id}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{itemCount}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatCurrency(order.total, { decimals: 2 })}</dd>
        </div>
        <div>
          <dt>Shipping to</dt>
          <dd>
            {customer.shippingAddress.street}, {customer.shippingAddress.city}, {customer.shippingAddress.state}{' '}
            {customer.shippingAddress.zip}
          </dd>
        </div>
      </dl>
      <Link to="/store/shop" className="storefront__btn storefront__btn--primary">
        Continue shopping
      </Link>
    </div>
  )
}

function StorefrontCheckout() {
  const { items, subtotal, clear } = useCart()
  const { createCustomer } = useCustomers()
  const { placeOrder } = useOrders()

  const [values, setValues] = useState(EMPTY_VALUES)
  const [errors, setErrors] = useState({})
  const [orderError, setOrderError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  // Holds the customer once created, so a retry after a failed placeOrder reuses them instead of
  // trying (and failing, on a now-duplicate email) to create a second record for the same shopper.
  const createdCustomerRef = useRef(null)

  function handleChange(field) {
    return (event) => {
      const fieldValue = event.target.value
      setValues((current) => ({ ...current, [field]: fieldValue }))
      setErrors((current) => {
        if (!(field in current)) return current
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (items.length === 0 || submitting) return
    setSubmitting(true)
    setOrderError('')

    let customer = createdCustomerRef.current
    if (!customer) {
      const result = createCustomer({
        name: values.name,
        email: values.email,
        phone: values.phone,
        shippingAddress: { street: values.street, city: values.city, state: values.state, zip: values.zip },
      })
      if (!result.ok) {
        setErrors(result.errors)
        setSubmitting(false)
        return
      }
      customer = result.customer
      createdCustomerRef.current = customer
    }

    const orderResult = placeOrder({
      customerId: customer.id,
      items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    })
    setSubmitting(false)

    if (!orderResult.ok) {
      setOrderError(describeOrderError(orderResult.errors, items))
      return
    }

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    setConfirmation({ order: orderResult.order, customer, itemCount })
    clear()
  }

  if (confirmation) {
    return <ConfirmationView order={confirmation.order} customer={confirmation.customer} itemCount={confirmation.itemCount} />
  }

  if (items.length === 0) {
    return (
      <div className="storefront__section sf-cart-empty">
        <h1 className="sf-section-title">Your cart is empty</h1>
        <p className="sf-cart-empty__copy">Add something to your cart before checking out.</p>
        <Link to="/store/shop" className="storefront__btn storefront__btn--primary">
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="storefront__section sf-checkout">
      <h1 className="sf-section-title sf-checkout__title">Checkout</h1>

      <div className="sf-checkout__layout">
        <form className="sf-checkout__form" onSubmit={handleSubmit} noValidate>
          <p className="sf-checkout__form-heading">Contact &amp; shipping</p>
          <div className="sf-checkout__grid">
            {FIELDS.map((field) => (
              <div key={field.name} className={`sf-field${field.span === 1 ? ' sf-field--half' : ''}`}>
                <label htmlFor={`checkout-${field.name}`}>{field.label}</label>
                <input
                  id={`checkout-${field.name}`}
                  name={field.name}
                  type={field.type ?? 'text'}
                  autoComplete={field.autoComplete}
                  value={values[field.name]}
                  onChange={handleChange(field.name)}
                  aria-invalid={errors[field.name] ? 'true' : undefined}
                  aria-describedby={errors[field.name] ? `checkout-${field.name}-error` : undefined}
                />
                {errors[field.name] && (
                  <p id={`checkout-${field.name}-error`} className="sf-field__error" role="alert">
                    {errors[field.name]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {orderError && (
            <p className="sf-checkout__order-error" role="alert">
              {orderError}
            </p>
          )}

          <button type="submit" className="storefront__btn storefront__btn--primary storefront__btn--full" disabled={submitting}>
            {submitting ? 'Placing order…' : `Place order — ${formatCurrency(subtotal, { decimals: 2 })}`}
          </button>
        </form>

        <aside className="sf-checkout__summary">
          <p className="sf-checkout__summary-heading">Order summary</p>
          <ul className="sf-checkout__summary-lines">
            {items.map((item) => (
              <li key={item.product.id}>
                <span>
                  {item.product.name} <span className="sf-checkout__summary-qty">× {item.quantity}</span>
                </span>
                <span>{formatCurrency(item.lineTotal, { decimals: 2 })}</span>
              </li>
            ))}
          </ul>
          <div className="sf-checkout__summary-total">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, { decimals: 2 })}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default StorefrontCheckout
