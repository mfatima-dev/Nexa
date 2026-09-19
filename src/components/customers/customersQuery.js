import { paginate } from '../../utils/paginate.js'

export const STATUS_FILTER_OPTIONS = ['All', 'Active', 'Inactive', 'No orders']

export const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest customers' },
  { key: 'spend', label: 'Highest spend' },
  { key: 'orders', label: 'Most orders' },
  { key: 'recent', label: 'Recent activity' },
]

export const DEFAULT_FILTERS = {
  search: '',
  status: 'All',
  sort: 'newest',
}

export function hasActiveFilters(filters) {
  return (
    filters.search.trim() !== '' ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.sort !== DEFAULT_FILTERS.sort
  )
}

function matchesSearch({ customer }, query) {
  if (!query) return true
  return customer.name.toLowerCase().includes(query) || customer.email.toLowerCase().includes(query)
}

function time(value) {
  return value ? new Date(value).getTime() : 0
}

function compareStats(a, b, sort) {
  switch (sort) {
    case 'spend':
      return b.totalSpent - a.totalSpent || b.orderCount - a.orderCount
    case 'orders':
      return b.orderCount - a.orderCount || b.totalSpent - a.totalSpent
    case 'recent':
      // Customers with no orders sort last (time 0).
      return time(b.lastOrderAt) - time(a.lastOrderAt)
    case 'newest':
    default:
      return time(b.customer.joinedAt) - time(a.customer.joinedAt)
  }
}

/** Applies search and status filters to customer stats, then sorts. Pure. */
export function filterAndSortCustomers(stats, filters) {
  const query = filters.search.trim().toLowerCase()

  return stats
    .filter((entry) => {
      if (filters.status && filters.status !== 'All' && entry.status !== filters.status) return false
      return matchesSearch(entry, query)
    })
    .sort((a, b) => compareStats(a, b, filters.sort))
}

export function paginateCustomers(stats, page, pageSize) {
  return paginate(stats, page, pageSize)
}
