import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, filterAndSortInventory, hasActiveFilters, paginateInventory } from './inventoryQuery.js'

function entry(id, name, sku, category, stock, threshold, status, stockValue, unitsSold) {
  return { product: { id, name, sku, category, stock, lowStockThreshold: threshold }, status, stockValue, unitsSold }
}

const STATS = [
  entry('a', 'Alpha Pack', 'NX-BAG-01', 'Bags', 150, 40, 'In stock', 1500, 10),
  entry('b', 'Beta Bottle', 'NX-ACC-02', 'Accessories', 30, 60, 'Low stock', 300, 40),
  entry('c', 'Gamma Case', 'NX-TEC-03', 'Tech', 0, 20, 'Out of stock', 0, 25),
  entry('d', 'Delta Tote', 'NX-BAG-04', 'Bags', 96, 25, 'Discontinued', 900, 5),
  entry('e', 'Epsilon Wallet', 'NX-ACC-05', 'Accessories', 15, 60, 'Low stock', 150, 8),
]

const ids = (list) => list.map((e) => e.product.id)

describe('filterAndSortInventory', () => {
  it('puts what needs attention first by default: out, then low (most urgent first), then in stock, then discontinued', () => {
    // Epsilon is at 25% of its threshold, Beta at 50%, so Epsilon is more urgent.
    expect(ids(filterAndSortInventory(STATS, DEFAULT_FILTERS))).toEqual(['c', 'e', 'b', 'a', 'd'])
  })

  it('searches by name and by SKU, case-insensitively', () => {
    expect(ids(filterAndSortInventory(STATS, { ...DEFAULT_FILTERS, search: 'BOTTLE' }))).toEqual(['b'])
    expect(ids(filterAndSortInventory(STATS, { ...DEFAULT_FILTERS, search: 'nx-bag' })).sort()).toEqual(['a', 'd'])
  })

  it('filters by category', () => {
    expect(ids(filterAndSortInventory(STATS, { ...DEFAULT_FILTERS, category: 'Accessories' })).sort()).toEqual(['b', 'e'])
  })

  it('filters by each stock status', () => {
    const only = (status) => ids(filterAndSortInventory(STATS, { ...DEFAULT_FILTERS, status })).sort()
    expect(only('In stock')).toEqual(['a'])
    expect(only('Low stock')).toEqual(['b', 'e'])
    expect(only('Out of stock')).toEqual(['c'])
    expect(only('Discontinued')).toEqual(['d'])
  })

  it('sorts by stock, value, sales and name', () => {
    const sorted = (sort) => ids(filterAndSortInventory(STATS, { ...DEFAULT_FILTERS, sort }))
    expect(sorted('stock_asc')).toEqual(['c', 'e', 'b', 'd', 'a'])
    expect(sorted('stock_desc')).toEqual(['a', 'd', 'b', 'e', 'c'])
    expect(sorted('value')).toEqual(['a', 'd', 'b', 'e', 'c'])
    expect(sorted('sales')).toEqual(['b', 'c', 'a', 'e', 'd'])
    expect(sorted('name')).toEqual(['a', 'b', 'd', 'e', 'c'])
  })

  it('combines category, status and search', () => {
    const filters = { search: 'e', category: 'Accessories', status: 'Low stock', sort: 'name' }
    expect(ids(filterAndSortInventory(STATS, filters))).toEqual(['b', 'e'])
  })

  it('returns an empty list when nothing matches, without mutating the input', () => {
    const copy = [...STATS]
    expect(filterAndSortInventory(STATS, { ...DEFAULT_FILTERS, search: 'zzz' })).toEqual([])
    expect(STATS).toEqual(copy)
  })
})

describe('hasActiveFilters', () => {
  it('is false for the defaults and true when any control changes', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: 'x' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, category: 'Tech' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'Low stock' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'name' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: '   ' })).toBe(false)
  })
})

describe('paginateInventory', () => {
  it('slices and clamps pages', () => {
    const many = Array.from({ length: 22 }, (_, i) => ({ id: i }))
    expect(paginateInventory(many, 1, 10)).toMatchObject({ totalPages: 3, page: 1 })
    expect(paginateInventory(many, 99, 10).page).toBe(3)
  })
})
