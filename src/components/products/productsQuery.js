import { PRODUCT_CATEGORIES } from '../../data/products.js'
import { STATUS_LABELS, STOCK_LEVELS } from '../../data/productRules.js'
import { paginate } from '../../utils/paginate.js'

export const CATEGORY_OPTIONS = [
  { value: 'All', label: 'All categories' },
  ...PRODUCT_CATEGORIES.map((category) => ({ value: category, label: category })),
]

export const STATUS_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'active', label: STATUS_LABELS.active },
  { value: 'discontinued', label: STATUS_LABELS.discontinued },
]

export const STOCK_OPTIONS = [{ value: 'All', label: 'All' }, ...STOCK_LEVELS.map((level) => ({ value: level, label: level }))]

export const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'sales', label: 'Best selling' },
  { value: 'stock', label: 'Lowest stock' },
  { value: 'newest', label: 'Newest' },
]

export const DEFAULT_FILTERS = {
  search: '',
  category: 'All',
  status: 'All',
  stock: 'All',
  sort: 'name',
}

export function hasActiveFilters(filters) {
  return (
    filters.search.trim() !== '' ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.stock !== DEFAULT_FILTERS.stock ||
    filters.sort !== DEFAULT_FILTERS.sort
  )
}

function matchesSearch({ product }, query) {
  if (!query) return true
  return product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
}

function compare(a, b, sort) {
  switch (sort) {
    case 'price_desc':
      return b.product.price - a.product.price
    case 'price_asc':
      return a.product.price - b.product.price
    case 'sales':
      return b.unitsSold - a.unitsSold || b.revenue - a.revenue
    case 'stock':
      return a.product.stock - b.product.stock
    case 'newest':
      return new Date(b.product.createdAt) - new Date(a.product.createdAt)
    case 'name':
    default:
      return a.product.name.localeCompare(b.product.name, undefined, { sensitivity: 'base' })
  }
}

/** Applies search (name/SKU), category, status and stock-level filters, then sorts. Pure. */
export function filterAndSortProducts(stats, filters) {
  const query = filters.search.trim().toLowerCase()

  return stats
    .filter((entry) => {
      if (filters.category !== 'All' && entry.product.category !== filters.category) return false
      if (filters.status !== 'All' && entry.product.status !== filters.status) return false
      if (filters.stock !== 'All' && entry.stockLevel !== filters.stock) return false
      return matchesSearch(entry, query)
    })
    .sort((a, b) => compare(a, b, filters.sort))
}

export function paginateProducts(stats, page, pageSize) {
  return paginate(stats, page, pageSize)
}
