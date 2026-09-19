import { Search, X } from 'lucide-react'
import './FilterToolbar.css'

/**
 * Search box + labelled select filters + a Clear button (rendered only when `showClear`).
 * `fields` is [{ key, label, value, options: [{ value, label }], onChange(value) }].
 */
function FilterToolbar({ search, fields, showClear, onClear }) {
  return (
    <div className="filter-toolbar">
      <label className="filter-toolbar__search">
        <Search size={16} className="filter-toolbar__search-icon" aria-hidden="true" />
        <input
          type="search"
          placeholder={search.placeholder}
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          aria-label={search.ariaLabel}
        />
      </label>

      {fields.map((field) => (
        <label key={field.key} className="filter-toolbar__field">
          <span className="filter-toolbar__field-label">{field.label}</span>
          <select value={field.value} onChange={(event) => field.onChange(event.target.value)}>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      {showClear && (
        <button type="button" className="filter-toolbar__clear" onClick={onClear}>
          <X size={14} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  )
}

export default FilterToolbar
