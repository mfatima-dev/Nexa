import { SearchX } from 'lucide-react'
import './OrdersEmptyState.css'

function OrdersEmptyState({ onClear }) {
  return (
    <div className="orders-empty">
      <span className="orders-empty__icon">
        <SearchX size={20} aria-hidden="true" />
      </span>
      <p className="orders-empty__title">No orders match your filters</p>
      <p className="orders-empty__description">Try adjusting your search or filter criteria.</p>
      <button type="button" className="orders-empty__clear" onClick={onClear}>
        Clear filters
      </button>
    </div>
  )
}

export default OrdersEmptyState
