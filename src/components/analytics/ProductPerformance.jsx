import { Link } from 'react-router-dom'
import StatusBadge from '../common/StatusBadge.jsx'
import { formatCurrency } from '../../utils/format.js'
import './ProductPerformance.css'

const AT_RISK = new Set(['Low stock', 'Out of stock'])

/**
 * Best sellers for the range, each with its share of revenue and its current stock, so a top seller
 * that is running out is visible (and one click from being restocked).
 */
function ProductPerformance({ items }) {
  if (!items.length) {
    return <p className="product-performance__empty">No product sales in this period.</p>
  }

  return (
    <ol className="product-performance">
      {items.map((entry, index) => (
        <li key={entry.product.id} className="product-performance__item">
          <span className="product-performance__rank">{index + 1}</span>
          <div className="product-performance__info">
            <div className="product-performance__row">
              <Link
                to={`/products?product=${entry.product.id}`}
                className="product-performance__name"
                aria-label={`View ${entry.product.name} in Products`}
              >
                {entry.product.name}
              </Link>
              <span className="product-performance__revenue">{formatCurrency(entry.revenue)}</span>
            </div>
            <div className="product-performance__meta">
              {(entry.revenueShare * 100).toFixed(1)}% of revenue · {entry.unitsSold} {entry.unitsSold === 1 ? 'unit' : 'units'} sold
            </div>
            <div className="product-performance__bar-track" aria-hidden="true">
              <div className="product-performance__bar-fill" style={{ width: `${Math.max(entry.share * 100, 4)}%` }} />
            </div>
            <div className="product-performance__stock">
              <StatusBadge status={entry.stockStatus} />
              <span className="product-performance__on-hand">{entry.stock} on hand</span>
              {AT_RISK.has(entry.stockStatus) && (
                <Link
                  to={`/inventory?product=${entry.product.id}`}
                  className="product-performance__action"
                  aria-label={`Manage stock for ${entry.product.name} in Inventory`}
                >
                  Manage stock
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default ProductPerformance
