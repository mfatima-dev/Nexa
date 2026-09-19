import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/format.js'
import './TopProductsList.css'

function TopProductsList({ items }) {
  if (!items.length) {
    return <p className="top-products__empty">No product sales yet.</p>
  }

  return (
    <ul className="top-products">
      {items.map((entry, index) => (
        <li key={entry.product.id}>
          <Link
            to={`/products?product=${entry.product.id}`}
            className="top-products__item"
            aria-label={`View ${entry.product.name} in Products`}
          >
            <span className="top-products__rank">{index + 1}</span>
            <div className="top-products__info">
              <div className="top-products__row">
                <span className="top-products__name">{entry.product.name}</span>
                <span className="top-products__revenue">{formatCurrency(entry.revenue)}</span>
              </div>
              <div className="top-products__meta">{entry.unitsSold} units sold</div>
              <div className="top-products__bar-track">
                <div className="top-products__bar-fill" style={{ width: `${Math.max(entry.share * 100, 4)}%` }} />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default TopProductsList
