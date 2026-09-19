import FilterToolbar from '../common/FilterToolbar.jsx'
import { CATEGORY_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS, hasActiveFilters } from './inventoryQuery.js'

function InventoryToolbar({ filters, onChange, onClear }) {
  return (
    <FilterToolbar
      search={{
        value: filters.search,
        onChange: (search) => onChange({ search }),
        placeholder: 'Search by name or SKU…',
        ariaLabel: 'Search inventory by product name or SKU',
      }}
      fields={[
        { key: 'category', label: 'Category', value: filters.category, options: CATEGORY_OPTIONS, onChange: (category) => onChange({ category }) },
        { key: 'status', label: 'Stock status', value: filters.status, options: STATUS_OPTIONS, onChange: (status) => onChange({ status }) },
        { key: 'sort', label: 'Sort', value: filters.sort, options: SORT_OPTIONS, onChange: (sort) => onChange({ sort }) },
      ]}
      showClear={hasActiveFilters(filters)}
      onClear={onClear}
    />
  )
}

export default InventoryToolbar
