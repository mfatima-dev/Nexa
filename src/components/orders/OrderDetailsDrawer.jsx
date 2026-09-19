import Drawer from '../common/Drawer.jsx'
import StatusBadge from '../common/StatusBadge.jsx'
import StatusTimeline from './StatusTimeline.jsx'
import { getCustomerById } from '../../data/selectors.js'
import { useProducts } from '../../context/useProducts.js'
import { getNextStatus, canCancelOrder } from '../../context/orderStatus.js'
import { formatDate } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import './OrderDetailsDrawer.css'

function OrderDetailsDrawer({ order, onClose, onUpdateStatus }) {
  const { products } = useProducts()
  if (!order) return null

  const customer = getCustomerById(order.customerId)
  const nextStatus = getNextStatus(order.status)
  const cancellable = canCancelOrder(order.status)

  const actions =
    nextStatus || cancellable ? (
      <>
        {nextStatus && (
          <button
            type="button"
            className="order-drawer__action order-drawer__action--primary"
            onClick={() => onUpdateStatus(order.id, nextStatus)}
          >
            Mark as {nextStatus}
          </button>
        )}
        {cancellable && (
          <button
            type="button"
            className="order-drawer__action order-drawer__action--danger"
            onClick={() => onUpdateStatus(order.id, 'Cancelled')}
          >
            Cancel order
          </button>
        )}
      </>
    ) : null

  return (
    <Drawer
      title={`Order ${order.id}`}
      badge={<StatusBadge status={order.status} />}
      closeLabel="Close order details"
      onClose={onClose}
      footer={actions}
    >
      <section>
        <h3 className="drawer__section-title">Customer</h3>
        <p className="order-drawer__customer-name">{customer?.name ?? 'Unknown customer'}</p>
        <p className="order-drawer__customer-email">{customer?.email ?? '—'}</p>
      </section>

      <section>
        <h3 className="drawer__section-title">Order date</h3>
        <p>{formatDate(order.placedAt, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </section>

      {customer && (
        <section>
          <h3 className="drawer__section-title">Shipping</h3>
          <p>
            Ships to {customer.city}, {customer.state}
          </p>
        </section>
      )}

      <section>
        <h3 className="drawer__section-title">Items</h3>
        <table className="order-drawer__items">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Line total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              // Live name if the product still exists; otherwise the name captured on the order.
              const product = products.find((candidate) => candidate.id === item.productId)
              const lineTotal = item.quantity * item.unitPrice
              return (
                <tr key={item.productId}>
                  <td>{product?.name ?? item.productName ?? 'Unknown product'}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice, { decimals: 2 })}</td>
                  <td>{formatCurrency(lineTotal, { decimals: 2 })}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="order-drawer__total-label">
                Order total
              </td>
              <td className="order-drawer__total-value">{formatCurrency(order.total, { decimals: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section>
        <h3 className="drawer__section-title">Status timeline</h3>
        <StatusTimeline order={order} />
      </section>
    </Drawer>
  )
}

export default OrderDetailsDrawer
