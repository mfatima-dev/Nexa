import { Minus, Plus } from 'lucide-react'
import './QuantitySelector.css'

/** A small increment/decrement control, shared by the product page and the cart. `max` is the live
 * available quantity — the control simply can't be pushed past it, so the cap is always the real one. */
function QuantitySelector({ quantity, max, onChange, label }) {
  return (
    <div className="sf-qty" role="group" aria-label={label ?? 'Quantity'}>
      <button
        type="button"
        className="sf-qty__btn"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
      >
        <Minus size={14} strokeWidth={2} aria-hidden="true" />
      </button>
      <span className="sf-qty__value" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className="sf-qty__btn"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= max}
        aria-label="Increase quantity"
      >
        <Plus size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}

export default QuantitySelector
