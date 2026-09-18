import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import StatusBadge from '../common/StatusBadge.jsx'
import StatusTimeline from './StatusTimeline.jsx'
import { getCustomerById, getProductById } from '../../data/selectors.js'
import { getNextStatus, canCancelOrder } from '../../context/orderStatus.js'
import { formatDate } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import './OrderDetailsDrawer.css'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function OrderDetailsDrawer({ order, onClose, onUpdateStatus }) {
  const panelRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const orderId = order?.id

  useEffect(() => {
    if (!orderId) return undefined

    previouslyFocusedRef.current = document.activeElement
    const panel = panelRef.current
    const focusable = panel?.querySelectorAll(FOCUSABLE_SELECTOR)
    ;(focusable?.[0] ?? panel)?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panel) return

      const focusableEls = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
      if (focusableEls.length === 0) return

      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedRef.current?.focus?.()
    }
  }, [orderId, onClose])

  // Terminal transitions remove the button that had focus; keep focus inside the dialog.
  const status = order?.status
  useEffect(() => {
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
  }, [status])

  if (!order) return null

  const customer = getCustomerById(order.customerId)
  const nextStatus = getNextStatus(order.status)
  const cancellable = canCancelOrder(order.status)

  return (
    <div className="order-drawer">
      <div className="order-drawer__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="order-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-drawer-title"
        ref={panelRef}
        tabIndex={-1}
      >
        <header className="order-drawer__header">
          <div>
            <h2 id="order-drawer-title" className="order-drawer__title">
              Order {order.id}
            </h2>
            <StatusBadge status={order.status} />
          </div>
          <button type="button" className="order-drawer__close" onClick={onClose} aria-label="Close order details">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="order-drawer__body">
          <section className="order-drawer__section">
            <h3 className="order-drawer__section-title">Customer</h3>
            <p className="order-drawer__customer-name">{customer?.name ?? 'Unknown customer'}</p>
            <p className="order-drawer__customer-email">{customer?.email ?? '—'}</p>
          </section>

          <section className="order-drawer__section">
            <h3 className="order-drawer__section-title">Order date</h3>
            <p>{formatDate(order.placedAt, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </section>

          {customer && (
            <section className="order-drawer__section">
              <h3 className="order-drawer__section-title">Shipping</h3>
              <p>
                Ships to {customer.city}, {customer.state}
              </p>
            </section>
          )}

          <section className="order-drawer__section">
            <h3 className="order-drawer__section-title">Items</h3>
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
                  const product = getProductById(item.productId)
                  const lineTotal = item.quantity * item.unitPrice
                  return (
                    <tr key={item.productId}>
                      <td>{product?.name ?? 'Unknown product'}</td>
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

          <section className="order-drawer__section">
            <h3 className="order-drawer__section-title">Status timeline</h3>
            <StatusTimeline order={order} />
          </section>
        </div>

        {(nextStatus || cancellable) && (
          <footer className="order-drawer__footer">
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
          </footer>
        )}
      </div>
    </div>
  )
}

export default OrderDetailsDrawer
