import { Link } from 'react-router-dom'
import { ClipboardList, PackagePlus } from 'lucide-react'
import Button from '../common/Button.jsx'
import Drawer from '../common/Drawer.jsx'
import StatGrid from '../common/StatGrid.jsx'
import StatusBadge from '../common/StatusBadge.jsx'
import MovementHistory from './MovementHistory.jsx'
import { formatCurrency } from '../../utils/format.js'
import './InventoryDetailsDrawer.css'

const money = (value) => formatCurrency(value, { decimals: 2 })

/**
 * `entry` is one item from getInventoryStats(); `movements` is that product's history from
 * getProductMovements() (newest first, with balances). Restock and adjust are handled by the page.
 */
function InventoryDetailsDrawer({ entry, movements, onClose, onRestock, onAdjust }) {
  if (!entry) return null

  const { product } = entry
  const stockNote =
    product.status === 'discontinued'
      ? 'Discontinued products are not flagged for restock.'
      : product.stock <= 0
        ? 'Out of stock — restock to resume selling.'
        : product.stock <= product.lowStockThreshold
          ? `Low stock: ${product.stock} on hand, and the restock threshold is ${product.lowStockThreshold}.`
          : `${product.stock - product.lowStockThreshold} units above the restock threshold.`

  return (
    <Drawer
      title={product.name}
      badge={<StatusBadge status={entry.status} />}
      closeLabel="Close inventory details"
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" icon={PackagePlus} onClick={onRestock}>
            Restock
          </Button>
          <Button variant="secondary" icon={ClipboardList} onClick={onAdjust}>
            Adjust stock
          </Button>
        </>
      }
    >
      <section>
        <h3 className="drawer__section-title">Product</h3>
        <p className="inventory-drawer__sku">{product.sku}</p>
        <p className="inventory-drawer__muted">
          {product.category} · <Link to={`/products?product=${product.id}`}>View in Products</Link>
        </p>
      </section>

      <section>
        <h3 className="drawer__section-title">Stock</h3>
        <StatGrid
          items={[
            { label: 'On hand', value: `${product.stock} units` },
            { label: 'Low-stock threshold', value: `${product.lowStockThreshold} units` },
            { label: 'Stock value', value: money(entry.stockValue) },
            { label: 'Units sold', value: entry.unitsSold },
          ]}
        />
        <p className="inventory-drawer__muted">{stockNote}</p>
      </section>

      <section>
        <h3 className="drawer__section-title">Stock history</h3>
        <MovementHistory movements={movements} />
      </section>
    </Drawer>
  )
}

export default InventoryDetailsDrawer
