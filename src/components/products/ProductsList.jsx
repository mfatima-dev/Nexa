import StatusBadge from '../common/StatusBadge.jsx'
import { STATUS_LABELS } from '../../data/productRules.js'
import { formatCurrency } from '../../utils/format.js'
import './ProductsList.css'

// Low/out-of-stock warnings only matter for products we still sell.
function stockAlert(entry) {
  return entry.product.status === 'active' && entry.stockLevel !== 'In stock' ? entry.stockLevel : null
}

// `labelled` adds "in stock" for the mobile cards, which have no column header to explain the number.
function StockCell({ entry, labelled = false }) {
  const alert = stockAlert(entry)
  return (
    <span className="products-list__stock">
      <span>{labelled ? `${entry.product.stock} in stock` : entry.product.stock}</span>
      {alert && <StatusBadge status={alert} />}
    </span>
  )
}

function ProductsList({ products, onSelectProduct }) {
  return (
    <div className="products-list">
      <div className="products-list__table-wrap">
        <table className="products-list__table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th className="products-list__num">Price</th>
              <th className="products-list__num">Stock</th>
              <th className="products-list__num">Sold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((entry) => {
              const { product } = entry
              return (
                <tr key={product.id}>
                  <td>
                    <div className="products-list__name-block">
                    <button
                      type="button"
                      className="products-list__row-trigger"
                      onClick={() => onSelectProduct(product.id)}
                      aria-label={`View product ${product.name} — ${product.sku}, ${formatCurrency(product.price, { decimals: 2 })}, ${product.stock} in stock, ${STATUS_LABELS[product.status]}`}
                    >
                      {product.name}
                    </button>
                    <span className="products-list__sku">{product.sku}</span>
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td className="products-list__num">{formatCurrency(product.price, { decimals: 2 })}</td>
                  <td className="products-list__num">
                    <StockCell entry={entry} />
                  </td>
                  <td className="products-list__num">{entry.unitsSold}</td>
                  <td>
                    <StatusBadge status={STATUS_LABELS[product.status]} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="products-list__cards">
        {products.map((entry) => {
          const { product } = entry
          return (
            <li key={product.id}>
              <button type="button" className="products-list__card" onClick={() => onSelectProduct(product.id)}>
                <div className="products-list__card-top">
                  <span className="products-list__card-name">{product.name}</span>
                  <StatusBadge status={STATUS_LABELS[product.status]} />
                </div>
                <span className="products-list__card-sub">
                  {product.sku} · {product.category}
                </span>
                <div className="products-list__card-meta">
                  <StockCell entry={entry} labelled />
                  <span>{entry.unitsSold} sold</span>
                  <span className="products-list__card-price">{formatCurrency(product.price, { decimals: 2 })}</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default ProductsList
