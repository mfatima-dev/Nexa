import StatusBadge from '../common/StatusBadge.jsx'
import { formatCurrency } from '../../utils/format.js'
import './InventoryList.css'

const money = (value) => formatCurrency(value, { decimals: 2 })

function InventoryList({ items, onSelectProduct }) {
  return (
    <div className="inventory-list">
      <div className="inventory-list__table-wrap">
        <table className="inventory-list__table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th className="inventory-list__num">On hand</th>
              <th className="inventory-list__num">Threshold</th>
              <th>Stock status</th>
              <th className="inventory-list__num">Units sold</th>
              <th className="inventory-list__num">Stock value</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => {
              const { product } = entry
              return (
                <tr key={product.id}>
                  <td className="inventory-list__name">
                    <button
                      type="button"
                      className="inventory-list__row-trigger"
                      onClick={() => onSelectProduct(product.id)}
                      aria-label={`Manage stock for ${product.name} — ${product.sku}, ${product.stock} on hand, ${entry.status}`}
                    >
                      {product.name}
                    </button>
                  </td>
                  <td className="inventory-list__sku">{product.sku}</td>
                  <td className="inventory-list__num">{product.stock}</td>
                  <td className="inventory-list__num">{product.lowStockThreshold}</td>
                  <td>
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="inventory-list__num">{entry.unitsSold}</td>
                  <td className="inventory-list__num">{money(entry.stockValue)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="inventory-list__cards">
        {items.map((entry) => {
          const { product } = entry
          return (
            <li key={product.id}>
              <button type="button" className="inventory-list__card" onClick={() => onSelectProduct(product.id)}>
                <div className="inventory-list__card-top">
                  <span className="inventory-list__card-name">{product.name}</span>
                  <StatusBadge status={entry.status} />
                </div>
                <span className="inventory-list__card-sku">{product.sku}</span>
                <dl className="inventory-list__card-stats">
                  <div>
                    <dt>On hand</dt>
                    <dd>{product.stock}</dd>
                  </div>
                  <div>
                    <dt>Threshold</dt>
                    <dd>{product.lowStockThreshold}</dd>
                  </div>
                  <div>
                    <dt>Sold</dt>
                    <dd>{entry.unitsSold}</dd>
                  </div>
                  <div>
                    <dt>Value</dt>
                    <dd>{money(entry.stockValue)}</dd>
                  </div>
                </dl>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default InventoryList
