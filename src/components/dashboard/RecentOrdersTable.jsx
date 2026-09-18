import { Link } from 'react-router-dom'
import StatusBadge from '../common/StatusBadge.jsx'
import { formatDate } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import './RecentOrdersTable.css'

function RecentOrdersTable({ orders }) {
  if (!orders.length) {
    return <p className="recent-orders__empty">No orders yet.</p>
  }

  return (
    <div className="recent-orders">
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
                <Link
                  to="/orders"
                  className="recent-orders__row-link"
                  aria-label={`View order ${order.id} — ${order.customerName}, ${formatCurrency(order.total, { decimals: 2 })}, ${order.status}`}
                >
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
  )
}

export default RecentOrdersTable
