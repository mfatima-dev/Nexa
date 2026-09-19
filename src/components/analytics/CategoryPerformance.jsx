import { formatCurrency } from '../../utils/format.js'
import './CategoryPerformance.css'

const formatShare = (fraction) => `${(fraction * 100).toFixed(1)}%`

/** How the category did against the previous period, or null when there is no fair comparison. */
function comparison(row) {
  if (row.changePct !== null) {
    const up = row.changePct >= 0
    return { tone: up ? 'positive' : 'negative', text: `${up ? '+' : '−'}${Math.abs(row.changePct).toFixed(1)}% vs previous period` }
  }
  if (row.previousRevenue === 0 && row.revenue > 0) return { tone: 'neutral', text: 'No sales in previous period' }
  return null
}

/** Revenue by product category, one row per category, biggest first, with the change on the previous period. */
function CategoryPerformance({ rows }) {
  if (!rows.some((row) => row.revenue > 0)) {
    return <p className="category-performance__empty">No sales in this period.</p>
  }

  return (
    <ul className="category-performance">
      {rows.map((row) => {
        const change = comparison(row)
        return (
          <li key={row.category} className="category-performance__item">
            <div className="category-performance__row">
              <span className="category-performance__name">{row.category}</span>
              <span className="category-performance__revenue">{formatCurrency(row.revenue)}</span>
            </div>
            <div className="category-performance__meta">
              <span>
                {formatShare(row.share)} of revenue · {row.unitsSold} {row.unitsSold === 1 ? 'unit' : 'units'} sold
              </span>
              {change && (
                <span className={`category-performance__change category-performance__change--${change.tone}`}>
                  {change.text}
                </span>
              )}
            </div>
            <div className="category-performance__bar-track" aria-hidden="true">
              <div className="category-performance__bar-fill" style={{ width: `${row.share * 100}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default CategoryPerformance
