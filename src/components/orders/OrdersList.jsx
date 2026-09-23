import StatusBadge from '../common/StatusBadge.jsx'
import { useCustomers } from '../../context/useCustomers.js'
import { formatDate } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import './OrdersList.css'

function getItemCount(order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

// Live lookup (not the static seed), so a customer created after page load — e.g. at Storefront
// checkout — shows their real name immediately instead of "Unknown customer".
function findCustomer(customers, customerId) {
  return customers.find((candidate) => candidate.id === customerId) ?? null
}

function OrdersList({ orders, onSelectOrder }) {
  const { customers } = useCustomers()
  return (
    <div className="orders-list">
      <div className="orders-list__table-wrap">
        <table className="orders-list__table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const customer = findCustomer(customers, order.customerId)
              return (
                <tr key={order.id}>
                  <td className="orders-list__id-cell">
                    <button
                      type="button"
                      className="orders-list__row-trigger"
                      onClick={() => onSelectOrder(order.id)}
                      aria-label={`View order ${order.id} — ${customer?.name ?? 'Unknown customer'}, ${formatCurrency(order.total, { decimals: 2 })}, ${order.status}`}
                    >
                      {order.id}
                    </button>
                  </td>
                  <td>{customer?.name ?? 'Unknown customer'}</td>
                  <td>{formatDate(order.placedAt)}</td>
                  <td>{getItemCount(order)}</td>
                  <td>{formatCurrency(order.total, { decimals: 2 })}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="orders-list__cards">
        {orders.map((order) => {
          const customer = findCustomer(customers, order.customerId)
          return (
            <li key={order.id}>
              <button type="button" className="orders-list__card" onClick={() => onSelectOrder(order.id)}>
                <div className="orders-list__card-top">
                  <span className="orders-list__card-id">{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="orders-list__card-customer">{customer?.name ?? 'Unknown customer'}</div>
                <div className="orders-list__card-meta">
                  <span>{formatDate(order.placedAt)}</span>
                  <span>{getItemCount(order)} items</span>
                  <span className="orders-list__card-total">{formatCurrency(order.total, { decimals: 2 })}</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default OrdersList
