import { Search, X } from 'lucide-react'
import { DATE_FILTER_OPTIONS, SORT_OPTIONS, STATUS_FILTER_OPTIONS, hasActiveFilters } from './ordersQuery.js'
import './OrdersToolbar.css'

function OrdersToolbar({ filters, onChange, onClear }) {
  const showClear = hasActiveFilters(filters)

  return (
    <div className="orders-toolbar">
      <label className="orders-toolbar__search">
        <Search size={16} className="orders-toolbar__search-icon" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search by order ID or customer…"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          aria-label="Search orders by ID or customer name"
        />
      </label>

      <label className="orders-toolbar__field">
        <span className="orders-toolbar__field-label">Status</span>
        <select value={filters.status} onChange={(event) => onChange({ status: event.target.value })}>
          {STATUS_FILTER_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="orders-toolbar__field">
        <span className="orders-toolbar__field-label">Date</span>
        <select value={filters.dateRange} onChange={(event) => onChange({ dateRange: event.target.value })}>
          {DATE_FILTER_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="orders-toolbar__field">
        <span className="orders-toolbar__field-label">Sort</span>
        <select value={filters.sort} onChange={(event) => onChange({ sort: event.target.value })}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {showClear && (
        <button type="button" className="orders-toolbar__clear" onClick={onClear}>
          <X size={14} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  )
}

export default OrdersToolbar
