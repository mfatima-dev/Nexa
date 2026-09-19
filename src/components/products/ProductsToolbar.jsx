import FilterToolbar from '../common/FilterToolbar.jsx'
import { CATEGORY_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS, STOCK_OPTIONS, hasActiveFilters } from './productsQuery.js'

function ProductsToolbar({ filters, onChange, onClear }) {
  return (
    <FilterToolbar
      search={{
        value: filters.search,
        onChange: (search) => onChange({ search }),
        placeholder: 'Search by name or SKU…',
        ariaLabel: 'Search products by name or SKU',
      }}
      fields={[
        { key: 'category', label: 'Category', value: filters.category, options: CATEGORY_OPTIONS, onChange: (category) => onChange({ category }) },
        { key: 'status', label: 'Status', value: filters.status, options: STATUS_OPTIONS, onChange: (status) => onChange({ status }) },
        { key: 'stock', label: 'Stock', value: filters.stock, options: STOCK_OPTIONS, onChange: (stock) => onChange({ stock }) },
        { key: 'sort', label: 'Sort', value: filters.sort, options: SORT_OPTIONS, onChange: (sort) => onChange({ sort }) },
      ]}
      showClear={hasActiveFilters(filters)}
      onClear={onClear}
    />
  )
}

export default ProductsToolbar
