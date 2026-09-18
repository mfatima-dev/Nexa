import './OrdersSummary.css'

const ITEMS = [
  { key: 'Total', label: 'Total', modifier: 'total', filterStatus: 'All' },
  { key: 'Pending', label: 'Pending', modifier: 'warning', filterStatus: 'Pending' },
  { key: 'Processing', label: 'Processing', modifier: 'accent', filterStatus: 'Processing' },
  { key: 'Shipped', label: 'Shipped', modifier: 'accent', filterStatus: 'Shipped' },
  { key: 'Delivered', label: 'Delivered', modifier: 'success', filterStatus: 'Delivered' },
  { key: 'Cancelled', label: 'Cancelled', modifier: 'danger', filterStatus: 'Cancelled' },
]

function OrdersSummary({ counts, activeStatus, onSelectStatus }) {
  return (
    <div className="orders-summary" role="group" aria-label="Filter orders by status">
      {ITEMS.map((item) => {
        const count = counts[item.key] ?? 0
        const isActive = activeStatus === item.filterStatus

        return (
          <button
            key={item.key}
            type="button"
            className={`orders-summary__item${isActive ? ' orders-summary__item--active' : ''}`}
            aria-pressed={isActive}
            aria-label={`${item.label}: ${count} orders`}
            onClick={() => onSelectStatus(item.filterStatus)}
          >
            <span className={`orders-summary__value orders-summary__value--${item.modifier}`}>{count}</span>
            <span className="orders-summary__label">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default OrdersSummary
