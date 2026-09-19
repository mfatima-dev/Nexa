import { Link } from 'react-router-dom'
import Drawer from '../common/Drawer.jsx'
import StatGrid from '../common/StatGrid.jsx'
import StatusBadge from '../common/StatusBadge.jsx'
import { formatDate } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import './CustomerDetailsDrawer.css'

const HISTORY_LIMIT = 5

/**
 * `entry` is one item from getCustomerStats(); `orders` is that customer's orders, newest first.
 * Orders link into the existing Orders page (`/orders?order=ID`), which owns order details.
 */
function CustomerDetailsDrawer({ entry, orders, onClose }) {
  if (!entry) return null

  const { customer } = entry
  const recentOrders = orders.slice(0, HISTORY_LIMIT)
  const hasOrders = entry.orderCount > 0

  return (
    <Drawer
      title={customer.name}
      badge={<StatusBadge status={entry.status} />}
      closeLabel="Close customer details"
      onClose={onClose}
    >
      <section>
        <h3 className="drawer__section-title">Contact</h3>
        <p className="customer-drawer__email">{customer.email}</p>
        <p className="customer-drawer__muted">
          {customer.city}, {customer.state}
        </p>
      </section>

      <section>
        <h3 className="drawer__section-title">Customer since</h3>
        <p>{formatDate(customer.joinedAt, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </section>

      <section>
        <h3 className="drawer__section-title">Purchase summary</h3>
        <StatGrid
          items={[
            { label: 'Total orders', value: entry.orderCount },
            { label: 'Total spent', value: formatCurrency(entry.totalSpent, { decimals: 2 }) },
            {
              label: 'Avg. order value',
              value: hasOrders && entry.averageOrderValue > 0 ? formatCurrency(entry.averageOrderValue, { decimals: 2 }) : '—',
            },
            {
              label: 'Last order',
              value: entry.lastOrderAt ? formatDate(entry.lastOrderAt, { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
            },
          ]}
        />
      </section>

      <section>
        <h3 className="drawer__section-title">Order history</h3>
        {hasOrders ? (
          <>
            <ul className="customer-drawer__orders">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link to={`/orders?order=${order.id}`} className="customer-drawer__order">
                    <span className="customer-drawer__order-main">
                      <span className="customer-drawer__order-id">{order.id}</span>
                      <span className="customer-drawer__muted">{formatDate(order.placedAt)}</span>
                    </span>
                    <StatusBadge status={order.status} />
                    <span className="customer-drawer__order-amount">{formatCurrency(order.total, { decimals: 2 })}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {orders.length > HISTORY_LIMIT && (
              <Link to={`/orders?q=${encodeURIComponent(customer.name)}`} className="customer-drawer__view-all">
                View all {orders.length} orders
              </Link>
            )}
          </>
        ) : (
          <p className="customer-drawer__muted">This customer hasn't placed an order yet.</p>
        )}
      </section>
    </Drawer>
  )
}

export default CustomerDetailsDrawer
