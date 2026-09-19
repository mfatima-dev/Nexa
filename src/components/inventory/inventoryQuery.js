import { CATEGORY_OPTIONS } from '../products/productsQuery.js'
import { paginate } from '../../utils/paginate.js'

export { CATEGORY_OPTIONS }

export const STATUS_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'In stock', label: 'In stock' },
  { value: 'Low stock', label: 'Low stock' },
  { value: 'Out of stock', label: 'Out of stock' },
  { value: 'Discontinued', label: 'Discontinued' },
]

export const SORT_OPTIONS = [
  { value: 'attention', label: 'Needs attention first' },
  { value: 'stock_asc', label: 'Stock: low to high' },
  { value: 'stock_desc', label: 'Stock: high to low' },
  { value: 'value', label: 'Stock value' },
  { value: 'sales', label: 'Best selling' },
  { value: 'name', label: 'Name (A–Z)' },
]

export const DEFAULT_FILTERS = {
  search: '',
  category: 'All',
  status: 'All',
  sort: 'attention',
}

export function hasActiveFilters(filters) {
  return (
    filters.search.trim() !== '' ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.sort !== DEFAULT_FILTERS.sort
  )
}

const ATTENTION_RANK = { 'Out of stock': 0, 'Low stock': 1, 'In stock': 2, Discontinued: 3 }

function byName(a, b) {
  return a.product.name.localeCompare(b.product.name, undefined, { sensitivity: 'base' })
}

// How close to (or far below) its threshold a product is: lower means more urgent.
function cover(entry) {
  return entry.product.stock / Math.max(entry.product.lowStockThreshold, 1)
}

function compare(a, b, sort) {
  switch (sort) {
    case 'stock_asc':
      return a.product.stock - b.product.stock || byName(a, b)
    case 'stock_desc':
      return b.product.stock - a.product.stock || byName(a, b)
    case 'value':
      return b.stockValue - a.stockValue || byName(a, b)
    case 'sales':
      return b.unitsSold - a.unitsSold || byName(a, b)
    case 'name':
      return byName(a, b)
    case 'attention':
    default:
      return ATTENTION_RANK[a.status] - ATTENTION_RANK[b.status] || cover(a) - cover(b) || byName(a, b)
  }
}

/** Search (name/SKU), category and stock-status filters, then sort. Pure. */
export function filterAndSortInventory(stats, filters) {
  const query = filters.search.trim().toLowerCase()

  return stats
    .filter((entry) => {
      const { product } = entry
      if (filters.category !== 'All' && product.category !== filters.category) return false
      if (filters.status !== 'All' && entry.status !== filters.status) return false
      if (query && !product.name.toLowerCase().includes(query) && !product.sku.toLowerCase().includes(query)) return false
      return true
    })
    .sort((a, b) => compare(a, b, filters.sort))
}

export function paginateInventory(stats, page, pageSize) {
  return paginate(stats, page, pageSize)
}
