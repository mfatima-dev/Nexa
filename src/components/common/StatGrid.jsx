import './StatGrid.css'

/** Compact label/value tiles for detail drawers. `items` is [{ label, value }]; value may be a node. */
function StatGrid({ items }) {
  return (
    <dl className="stat-grid">
      {items.map((item) => (
        <div key={item.label} className="stat-grid__item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default StatGrid
