import { paginate } from '../../utils/paginate.js'

export const STATUS_FILTER_OPTIONS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

export const DATE_FILTER_OPTIONS = [
  { key: 'all', label: 'All time', days: null },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
]

export const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'amount_desc', label: 'Highest amount' },
  { key: 'amount_asc', label: 'Lowest amount' },
]

export const DEFAULT_FILTERS = {
  search: '',
  status: 'All',
  dateRange: 'all',
  sort: 'newest',
}

export function hasActiveFilters(filters) {
  return (
    filters.search.trim() !== '' ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.dateRange !== DEFAULT_FILTERS.dateRange ||
    filters.sort !== DEFAULT_FILTERS.sort
  )
}

function matchesSearch(order, query, customers) {
  if (!query) return true
  const customerName = customers.find((customer) => customer.id === order.customerId)?.name?.toLowerCase() ?? ''
  return order.id.toLowerCase().includes(query) || customerName.includes(query)
}

function matchesDateRange(order, dateRange, now) {
  if (!dateRange || dateRange === 'all') return true
  const config = DATE_FILTER_OPTIONS.find((option) => option.key === dateRange)
  if (!config?.days) return true
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - config.days)
  return new Date(order.placedAt) >= cutoff
}

function compareOrders(a, b, sort) {
  switch (sort) {
    case 'oldest':
      return new Date(a.placedAt) - new Date(b.placedAt)
    case 'amount_desc':
      return b.total - a.total
    case 'amount_asc':
      return a.total - b.total
    case 'newest':
    default:
      return new Date(b.placedAt) - new Date(a.placedAt)
  }
}

/**
 * Applies search, status, and date filters, then sorts. Pure — safe to unit test directly.
 * `customers` is the live customer list (CustomersContext), so searching by name also finds customers
 * created after the seed, e.g. at Storefront checkout.
 */
export function filterAndSortOrders(orders, filters, now = new Date(), customers = []) {
  const query = filters.search.trim().toLowerCase()

  const filtered = orders.filter((order) => {
    if (filters.status && filters.status !== 'All' && order.status !== filters.status) return false
    if (!matchesDateRange(order, filters.dateRange, now)) return false
    if (!matchesSearch(order, query, customers)) return false
    return true
  })

  return filtered.sort((a, b) => compareOrders(a, b, filters.sort))
}

export function paginateOrders(orders, page, pageSize) {
  return paginate(orders, page, pageSize)
}
