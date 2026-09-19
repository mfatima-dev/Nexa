import { Link } from 'react-router-dom'
import StatusBadge from '../common/StatusBadge.jsx'
import { formatDate } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import './RecentOrdersTable.css'

function orderLabel(order) {
  return `View order ${order.id} — ${order.customerName}, ${formatCurrency(order.total, { decimals: 2 })}, ${order.status}`
}

// Like the other list pages, this renders a table and a card list; the stylesheet shows one or the other.
function RecentOrdersTable({ orders }) {
  if (!orders.length) {
    return <p className="recent-orders__empty">No orders yet.</p>
  }

  return (
    <div className="recent-orders">
      <div className="recent-orders__table-wrap">
        <table className="recent-orders__table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="recent-orders__id">
                  <Link to="/orders" className="recent-orders__row-link" aria-label={orderLabel(order)}>
                    {order.id}
                  </Link>
                </td>
                <td>{order.customerName}</td>
                <td>{formatDate(order.placedAt)}</td>
                <td>{formatCurrency(order.total, { decimals: 2 })}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="recent-orders__cards">
        {orders.map((order) => (
          <li key={order.id}>
            <Link to="/orders" className="recent-orders__card" aria-label={orderLabel(order)}>
              <div className="recent-orders__card-top">
                <span className="recent-orders__card-id">{order.id}</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="recent-orders__card-customer">{order.customerName}</div>
              <div className="recent-orders__card-meta">
                <span>{formatDate(order.placedAt)}</span>
                <span className="recent-orders__card-total">{formatCurrency(order.total, { decimals: 2 })}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default RecentOrdersTable
