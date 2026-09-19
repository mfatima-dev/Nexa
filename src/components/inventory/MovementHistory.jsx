import { useState } from 'react'
import { Link } from 'react-router-dom'
import { movementLabel } from '../../data/inventorySelectors.js'
import { formatDate } from '../../utils/date.js'
import { formatSignedChange } from '../../utils/format.js'
import './MovementHistory.css'

const VISIBLE = 6

/**
 * Newest-first stock movements for one product. `movements` come from getProductMovements(), so
 * each carries the on-hand balance right after it. Order fulfillments link to the existing order.
 */
function MovementHistory({ movements }) {
  const [showAll, setShowAll] = useState(false)

  if (movements.length === 0) {
    return <p className="movement-history__empty">No stock movements recorded yet.</p>
  }

  const shown = showAll ? movements : movements.slice(0, VISIBLE)

  return (
    <>
      <ul className="movement-history">
        {shown.map((movement) => (
          <li key={movement.id} className="movement-history__item">
            <div className="movement-history__main">
              <span className="movement-history__reason">{movementLabel(movement)}</span>
              <span className="movement-history__detail">
                {movement.orderId ? (
                  <Link to={`/orders?order=${movement.orderId}`}>Order {movement.orderId} shipped</Link>
                ) : (
                  movement.detail
                )}
                {movement.note ? ` · ${movement.note}` : ''}
              </span>
              <span className="movement-history__date">
                {formatDate(movement.occurredAt, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="movement-history__numbers">
              <span
                className={`movement-history__change${movement.change > 0 ? ' movement-history__change--up' : ''}`}
                aria-label={`${movement.change > 0 ? 'Added' : movement.change < 0 ? 'Removed' : 'No change,'} ${Math.abs(movement.change)} units`}
              >
                {formatSignedChange(movement.change)}
              </span>
              <span className="movement-history__balance">{movement.balanceAfter} on hand</span>
            </div>
          </li>
        ))}
      </ul>
      {movements.length > VISIBLE && (
        <button type="button" className="movement-history__toggle" onClick={() => setShowAll((current) => !current)}>
          {showAll ? 'Show fewer' : `Show all ${movements.length} movements`}
        </button>
      )}
    </>
  )
}

export default MovementHistory
