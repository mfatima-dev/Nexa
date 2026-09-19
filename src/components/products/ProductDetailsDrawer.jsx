import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import Button from '../common/Button.jsx'
import Drawer from '../common/Drawer.jsx'
import StatGrid from '../common/StatGrid.jsx'
import StatusBadge from '../common/StatusBadge.jsx'
import { STATUS_LABELS } from '../../data/productRules.js'
import { formatDate } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import './ProductDetailsDrawer.css'

const money = (value) => formatCurrency(value, { decimals: 2 })

/**
 * `entry` is one item from getProductStats(). Deleting asks for confirmation inline (in the
 * footer) rather than opening a second modal, so Escape and focus handling stay unambiguous.
 */
function ProductDetailsDrawer({ entry, onClose, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (confirming) cancelRef.current?.focus()
  }, [confirming])

  if (!entry) return null

  const { product } = entry
  const profitPerUnit = product.price - product.cost
  const stockAlert = product.status === 'active' && entry.stockLevel !== 'In stock'

  const footer = confirming ? (
    <div className="product-drawer__confirm" role="group" aria-label="Confirm delete">
      <p className="product-drawer__confirm-text">
        Delete “{product.name}”?{' '}
        {entry.orderCount > 0
          ? `It appears in ${entry.orderCount} ${entry.orderCount === 1 ? 'order' : 'orders'}; those orders keep its name and price.`
          : 'It has no order history.'}{' '}
        This can’t be undone.
      </p>
      <div className="product-drawer__confirm-actions">
        <Button ref={cancelRef} variant="secondary" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button variant="danger-solid" icon={Trash2} onClick={onDelete}>
          Delete product
        </Button>
      </div>
    </div>
  ) : (
    <>
      <Button variant="primary" icon={Pencil} onClick={onEdit}>
        Edit
      </Button>
      <Button variant="danger" icon={Trash2} onClick={() => setConfirming(true)}>
        Delete
      </Button>
    </>
  )

  return (
    <Drawer
      title={product.name}
      badge={<StatusBadge status={STATUS_LABELS[product.status]} />}
      closeLabel="Close product details"
      // While confirming, Escape/backdrop/close back out of the confirmation first.
      onClose={confirming ? () => setConfirming(false) : onClose}
      footer={footer}
    >
      <section>
        <h3 className="drawer__section-title">Details</h3>
        <p className="product-drawer__sku">{product.sku}</p>
        <p className="product-drawer__muted">
          {product.category} · Added {formatDate(product.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </section>

      <section>
        <h3 className="drawer__section-title">Pricing</h3>
        <StatGrid
          items={[
            { label: 'Price', value: money(product.price) },
            { label: 'Unit cost', value: money(product.cost) },
            { label: 'Profit per unit', value: money(profitPerUnit) },
            { label: 'Margin', value: `${(entry.margin * 100).toFixed(1)}%` },
          ]}
        />
      </section>

      <section>
        <h3 className="drawer__section-title">Stock</h3>
        <StatGrid
          items={[
            { label: 'On hand', value: `${product.stock} units` },
            { label: 'Low-stock threshold', value: `${product.lowStockThreshold} units` },
          ]}
        />
        <p className="product-drawer__stock-note">
          <StatusBadge status={entry.stockLevel} />
          {stockAlert && <span>Consider restocking soon.</span>}
          {product.status === 'discontinued' && <span>Discontinued products aren’t flagged for restock.</span>}
        </p>
        <p className="product-drawer__muted">
          <Link to={`/inventory?product=${product.id}`}>Manage stock in Inventory</Link>
        </p>
      </section>

      <section>
        <h3 className="drawer__section-title">Sales</h3>
        <StatGrid
          items={[
            { label: 'Units sold', value: entry.unitsSold },
            { label: 'Revenue', value: money(entry.revenue) },
            { label: 'Orders', value: entry.orderCount },
          ]}
        />
        <p className="product-drawer__muted">Based on non-cancelled orders.</p>
      </section>
    </Drawer>
  )
}

export default ProductDetailsDrawer
