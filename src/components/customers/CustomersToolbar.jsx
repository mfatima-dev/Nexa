import FilterToolbar from '../common/FilterToolbar.jsx'
import { SORT_OPTIONS, STATUS_FILTER_OPTIONS, hasActiveFilters } from './customersQuery.js'

const STATUS_OPTIONS = STATUS_FILTER_OPTIONS.map((status) => ({ value: status, label: status }))
const SORT_SELECT_OPTIONS = SORT_OPTIONS.map((option) => ({ value: option.key, label: option.label }))

function CustomersToolbar({ filters, onChange, onClear }) {
  return (
    <FilterToolbar
      search={{
        value: filters.search,
        onChange: (search) => onChange({ search }),
        placeholder: 'Search by name or email…',
        ariaLabel: 'Search customers by name or email',
      }}
      fields={[
        { key: 'status', label: 'Status', value: filters.status, options: STATUS_OPTIONS, onChange: (status) => onChange({ status }) },
        { key: 'sort', label: 'Sort', value: filters.sort, options: SORT_SELECT_OPTIONS, onChange: (sort) => onChange({ sort }) },
      ]}
      showClear={hasActiveFilters(filters)}
      onClear={onClear}
    />
  )
}

export default CustomersToolbar
