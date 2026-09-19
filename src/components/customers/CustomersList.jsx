import StatusBadge from '../common/StatusBadge.jsx'
import { formatDate } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import './CustomersList.css'

function lastOrderLabel(entry) {
  return entry.lastOrderAt ? formatDate(entry.lastOrderAt) : '—'
}

function CustomersList({ customers, onSelectCustomer }) {
  return (
    <div className="customers-list">
      <div className="customers-list__table-wrap">
        <table className="customers-list__table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th className="customers-list__num">Orders</th>
              <th className="customers-list__num">Total spent</th>
              <th>Last order</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((entry) => (
              <tr key={entry.customer.id}>
                <td className="customers-list__name-cell">
                  <button
                    type="button"
                    className="customers-list__row-trigger"
                    onClick={() => onSelectCustomer(entry.customer.id)}
                    aria-label={`View customer ${entry.customer.name} — ${entry.orderCount} orders, ${formatCurrency(entry.totalSpent, { decimals: 2 })} spent, ${entry.status}`}
                  >
                    {entry.customer.name}
                  </button>
                </td>
                <td className="customers-list__email">{entry.customer.email}</td>
                <td className="customers-list__num">{entry.orderCount}</td>
                <td className="customers-list__num">{formatCurrency(entry.totalSpent, { decimals: 2 })}</td>
                <td>{lastOrderLabel(entry)}</td>
                <td>
                  <StatusBadge status={entry.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="customers-list__cards">
        {customers.map((entry) => (
          <li key={entry.customer.id}>
            <button
              type="button"
              className="customers-list__card"
              onClick={() => onSelectCustomer(entry.customer.id)}
            >
              <div className="customers-list__card-top">
                <span className="customers-list__card-name">{entry.customer.name}</span>
                <StatusBadge status={entry.status} />
              </div>
              <span className="customers-list__card-email">{entry.customer.email}</span>
              <div className="customers-list__card-meta">
                <span>
                  {entry.orderCount} {entry.orderCount === 1 ? 'order' : 'orders'}
                </span>
                <span>Last: {lastOrderLabel(entry)}</span>
                <span className="customers-list__card-total">{formatCurrency(entry.totalSpent, { decimals: 2 })}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CustomersList
