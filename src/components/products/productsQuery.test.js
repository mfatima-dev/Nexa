import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, filterAndSortProducts, hasActiveFilters, paginateProducts } from './productsQuery.js'

function entry(id, name, sku, category, price, stock, status, unitsSold, createdAt, stockLevel = 'In stock') {
  return { product: { id, name, sku, category, price, stock, status, createdAt }, unitsSold, revenue: unitsSold * price, stockLevel }
}

const STATS = [
  entry('a', 'Urban Backpack', 'NX-BAG-01', 'Bags', 89, 142, 'active', 25, '2026-01-01T00:00:00Z'),
  entry('b', 'City Bottle', 'NX-ACC-04', 'Accessories', 28, 12, 'active', 60, '2026-02-01T00:00:00Z', 'Low stock'),
  entry('c', 'Rolling Carry-On', 'NX-TRA-19', 'Travel', 219, 0, 'active', 41, '2026-04-01T00:00:00Z', 'Out of stock'),
  entry('d', 'Foldable Tote', 'NX-BAG-21', 'Bags', 24, 96, 'discontinued', 5, '2026-03-01T00:00:00Z'),
]

const ids = (list) => list.map((e) => e.product.id)

describe('filterAndSortProducts', () => {
  it('sorts by name A-Z by default', () => {
    expect(ids(filterAndSortProducts(STATS, DEFAULT_FILTERS))).toEqual(['b', 'd', 'c', 'a'])
  })

  it('searches by name, case-insensitively', () => {
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, search: 'BOTTLE' }))).toEqual(['b'])
  })

  it('searches by SKU', () => {
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, search: 'tra-19' }))).toEqual(['c'])
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, search: 'nx-bag' })).sort()).toEqual(['a', 'd'])
  })

  it('filters by category', () => {
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, category: 'Bags' })).sort()).toEqual(['a', 'd'])
  })

  it('filters by status', () => {
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, status: 'discontinued' }))).toEqual(['d'])
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, status: 'active' }))).toHaveLength(3)
  })

  it('filters by stock level', () => {
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, stock: 'Low stock' }))).toEqual(['b'])
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, stock: 'Out of stock' }))).toEqual(['c'])
  })

  it('sorts by price both ways', () => {
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, sort: 'price_desc' }))).toEqual(['c', 'a', 'b', 'd'])
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, sort: 'price_asc' }))).toEqual(['d', 'b', 'a', 'c'])
  })

  it('sorts by best selling, lowest stock, and newest', () => {
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, sort: 'sales' }))).toEqual(['b', 'c', 'a', 'd'])
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, sort: 'stock' }))).toEqual(['c', 'b', 'd', 'a'])
    expect(ids(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, sort: 'newest' }))).toEqual(['c', 'd', 'b', 'a'])
  })

  it('combines filters', () => {
    const filters = { ...DEFAULT_FILTERS, category: 'Bags', status: 'active', sort: 'price_desc' }
    expect(ids(filterAndSortProducts(STATS, filters))).toEqual(['a'])
  })

  it('returns an empty list when nothing matches, without mutating the input', () => {
    const copy = [...STATS]
    expect(filterAndSortProducts(STATS, { ...DEFAULT_FILTERS, search: 'zzz' })).toEqual([])
    expect(STATS).toEqual(copy)
  })
})

describe('hasActiveFilters', () => {
  it('is false for defaults and true when any control changes', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: 'a' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, category: 'Tech' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'active' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, stock: 'Low stock' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'sales' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: '  ' })).toBe(false)
  })
})

describe('paginateProducts', () => {
  const many = Array.from({ length: 22 }, (_, i) => ({ id: i }))

  it('slices and clamps pages', () => {
    expect(paginateProducts(many, 1, 10)).toMatchObject({ totalPages: 3, page: 1 })
    expect(paginateProducts(many, 3, 10).pageItems).toHaveLength(2)
    expect(paginateProducts(many, 99, 10).page).toBe(3)
  })
})
