import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_FILTERS, filterAndSortOrders, hasActiveFilters, paginateOrders } from './ordersQuery.js'

vi.mock('../../data/selectors.js', () => ({
  getCustomerById: (id) => {
    const names = { c001: 'Sarah Bennett', c002: 'James Carter' }
    return names[id] ? { name: names[id] } : null
  },
}))

const NOW = new Date('2026-06-15T12:00:00.000Z')

function makeOrder(overrides) {
  return {
    id: 'NX-1000',
    customerId: 'c001',
    status: 'Delivered',
    placedAt: '2026-06-01T00:00:00.000Z',
    shippedAt: null,
    deliveredAt: null,
    items: [{ productId: 'p01', quantity: 1, unitPrice: 50 }],
    total: 50,
    ...overrides,
  }
}

const ORDERS = [
  makeOrder({ id: 'NX-1000', customerId: 'c001', status: 'Delivered', placedAt: '2026-06-14T00:00:00.000Z', total: 100 }),
  makeOrder({ id: 'NX-1001', customerId: 'c002', status: 'Pending', placedAt: '2026-06-10T00:00:00.000Z', total: 50 }),
  makeOrder({ id: 'NX-1002', customerId: 'c001', status: 'Cancelled', placedAt: '2026-05-01T00:00:00.000Z', total: 200 }),
  makeOrder({ id: 'NX-1003', customerId: 'c002', status: 'Shipped', placedAt: '2026-06-13T00:00:00.000Z', total: 30 }),
]

describe('filterAndSortOrders', () => {
  it('returns all orders newest-first by default', () => {
    const result = filterAndSortOrders(ORDERS, DEFAULT_FILTERS, NOW)
    expect(result.map((o) => o.id)).toEqual(['NX-1000', 'NX-1003', 'NX-1001', 'NX-1002'])
  })

  it('searches by order id (case-insensitive)', () => {
    const result = filterAndSortOrders(ORDERS, { ...DEFAULT_FILTERS, search: 'nx-1002' }, NOW)
    expect(result.map((o) => o.id)).toEqual(['NX-1002'])
  })

  it('searches by customer name', () => {
    const result = filterAndSortOrders(ORDERS, { ...DEFAULT_FILTERS, search: 'james' }, NOW)
    expect(result.map((o) => o.id).sort()).toEqual(['NX-1001', 'NX-1003'])
  })

  it('filters by status', () => {
    const result = filterAndSortOrders(ORDERS, { ...DEFAULT_FILTERS, status: 'Cancelled' }, NOW)
    expect(result.map((o) => o.id)).toEqual(['NX-1002'])
  })

  it('filters by date range (last 7 days)', () => {
    const result = filterAndSortOrders(ORDERS, { ...DEFAULT_FILTERS, dateRange: '7d' }, NOW)
    // NOW is 2026-06-15; cutoff is 2026-06-08, so only 2026-05-01 falls outside it
    expect(result.map((o) => o.id).sort()).toEqual(['NX-1000', 'NX-1001', 'NX-1003'])
  })

  it('sorts oldest first', () => {
    const result = filterAndSortOrders(ORDERS, { ...DEFAULT_FILTERS, sort: 'oldest' }, NOW)
    expect(result.map((o) => o.id)).toEqual(['NX-1002', 'NX-1001', 'NX-1003', 'NX-1000'])
  })

  it('sorts by highest amount', () => {
    const result = filterAndSortOrders(ORDERS, { ...DEFAULT_FILTERS, sort: 'amount_desc' }, NOW)
    expect(result.map((o) => o.id)).toEqual(['NX-1002', 'NX-1000', 'NX-1001', 'NX-1003'])
  })

  it('sorts by lowest amount', () => {
    const result = filterAndSortOrders(ORDERS, { ...DEFAULT_FILTERS, sort: 'amount_asc' }, NOW)
    expect(result.map((o) => o.id)).toEqual(['NX-1003', 'NX-1001', 'NX-1000', 'NX-1002'])
  })

  it('combines status filter and search', () => {
    const result = filterAndSortOrders(
      ORDERS,
      { ...DEFAULT_FILTERS, status: 'Pending', search: 'james' },
      NOW,
    )
    expect(result.map((o) => o.id)).toEqual(['NX-1001'])
  })

  it('returns an empty array when nothing matches', () => {
    const result = filterAndSortOrders(ORDERS, { ...DEFAULT_FILTERS, search: 'no such customer' }, NOW)
    expect(result).toEqual([])
  })
})

describe('hasActiveFilters', () => {
  it('is false for the default filters', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
  })

  it('is true when search is set', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: 'a' })).toBe(true)
  })

  it('is true when status is not All', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'Pending' })).toBe(true)
  })
})

describe('paginateOrders', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: `item-${i}` }))

  it('slices the first page correctly', () => {
    const result = paginateOrders(items, 1, 10)
    expect(result.pageItems).toHaveLength(10)
    expect(result.pageItems[0].id).toBe('item-0')
    expect(result.totalPages).toBe(3)
    expect(result.page).toBe(1)
  })

  it('slices a middle page correctly', () => {
    const result = paginateOrders(items, 2, 10)
    expect(result.pageItems[0].id).toBe('item-10')
    expect(result.pageItems).toHaveLength(10)
  })

  it('slices the last (partial) page correctly', () => {
    const result = paginateOrders(items, 3, 10)
    expect(result.pageItems).toHaveLength(5)
  })

  it('clamps a page number beyond the last page', () => {
    const result = paginateOrders(items, 99, 10)
    expect(result.page).toBe(3)
    expect(result.pageItems).toHaveLength(5)
  })

  it('clamps a page number below 1', () => {
    const result = paginateOrders(items, 0, 10)
    expect(result.page).toBe(1)
  })

  it('returns 1 total page for an empty list', () => {
    const result = paginateOrders([], 1, 10)
    expect(result.totalPages).toBe(1)
    expect(result.pageItems).toEqual([])
  })
})
