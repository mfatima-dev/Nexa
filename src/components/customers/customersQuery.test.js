import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, filterAndSortCustomers, hasActiveFilters, paginateCustomers } from './customersQuery.js'

function entry(id, name, email, joinedAt, orderCount, totalSpent, lastOrderAt, status) {
  return { customer: { id, name, email, joinedAt }, orderCount, totalSpent, lastOrderAt, status }
}

const STATS = [
  entry('c1', 'Sarah Bennett', 'sarah.bennett@gmail.com', '2026-01-10T00:00:00Z', 4, 400, '2026-06-01T00:00:00Z', 'Active'),
  entry('c2', 'James Carter', 'james.carter@outlook.com', '2026-03-10T00:00:00Z', 6, 250, '2026-02-01T00:00:00Z', 'Inactive'),
  entry('c3', 'Maria Diaz', 'maria.diaz@yahoo.com', '2026-05-10T00:00:00Z', 0, 0, null, 'No orders'),
  entry('c4', 'David Evans', 'david.evans@gmail.com', '2026-02-10T00:00:00Z', 2, 900, '2026-06-10T00:00:00Z', 'Active'),
]

const ids = (list) => list.map((e) => e.customer.id)

describe('filterAndSortCustomers', () => {
  it('sorts newest customers first by default', () => {
    expect(ids(filterAndSortCustomers(STATS, DEFAULT_FILTERS))).toEqual(['c3', 'c2', 'c4', 'c1'])
  })

  it('searches by name, case-insensitively', () => {
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, search: 'MARIA' }))).toEqual(['c3'])
  })

  it('searches by email', () => {
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, search: 'outlook.com' }))).toEqual(['c2'])
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, search: 'david.evans@' }))).toEqual(['c4'])
  })

  it('ignores surrounding whitespace in the search', () => {
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, search: '  james  ' }))).toEqual(['c2'])
  })

  it('filters by status', () => {
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, status: 'Active' })).sort()).toEqual(['c1', 'c4'])
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, status: 'Inactive' }))).toEqual(['c2'])
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, status: 'No orders' }))).toEqual(['c3'])
  })

  it('sorts by highest spend', () => {
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, sort: 'spend' }))).toEqual(['c4', 'c1', 'c2', 'c3'])
  })

  it('sorts by most orders', () => {
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, sort: 'orders' }))).toEqual(['c2', 'c1', 'c4', 'c3'])
  })

  it('sorts by recent activity, with customers who never ordered last', () => {
    expect(ids(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, sort: 'recent' }))).toEqual(['c4', 'c1', 'c2', 'c3'])
  })

  it('combines search, status and sort', () => {
    const result = filterAndSortCustomers(STATS, { search: '.com', status: 'Active', sort: 'spend' })
    expect(ids(result)).toEqual(['c4', 'c1'])
  })

  it('returns an empty list when nothing matches, without mutating the input', () => {
    const copy = [...STATS]
    expect(filterAndSortCustomers(STATS, { ...DEFAULT_FILTERS, search: 'nobody' })).toEqual([])
    expect(STATS).toEqual(copy)
  })
})

describe('hasActiveFilters', () => {
  it('is false for defaults and true when anything changes', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: 'a' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'Active' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'spend' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: '   ' })).toBe(false)
  })
})

describe('paginateCustomers', () => {
  const many = Array.from({ length: 23 }, (_, i) => ({ id: i }))

  it('slices pages and reports the total', () => {
    expect(paginateCustomers(many, 1, 10)).toMatchObject({ totalPages: 3, page: 1 })
    expect(paginateCustomers(many, 3, 10).pageItems).toHaveLength(3)
  })

  it('clamps out-of-range pages', () => {
    expect(paginateCustomers(many, 99, 10).page).toBe(3)
    expect(paginateCustomers(many, -4, 10).page).toBe(1)
  })
})
