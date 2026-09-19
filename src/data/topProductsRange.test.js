import { describe, expect, it } from 'vitest'
import { computeOverviewMetrics, getTopProducts } from './selectors.js'
import { daysAgo } from '../utils/date.js'

// A controlled business where every Overview range has a different best seller, so a Top Products list
// that ignored the range could not pass by accident. Revenue is quantity x unit price.
const NOW = new Date(2026, 5, 15, 12, 0)

const product = (id, name) => ({ id, name, category: 'Bags', price: 1, cost: 1, stock: 10, lowStockThreshold: 5, status: 'active' })
const CATALOG = ['old', 'yr', 'qtr', 'edge', 'mo', 'wk', 'canc'].map((id) => product(id, `Product ${id}`))

function order(id, placedAt, status, productId, quantity, unitPrice) {
  const items = [{ productId, productName: `Product ${productId}`, quantity, unitPrice }]
  return { id, customerId: 'c001', status, placedAt: placedAt.toISOString(), total: quantity * unitPrice, items }
}

const ORDERS = [
  order('NX-1', daysAgo(400, NOW), 'Delivered', 'old', 10, 100), //     $1000: outside every range
  order('NX-2', daysAgo(200, NOW), 'Delivered', 'yr', 4, 150), //       $600: 12M only
  order('NX-3', daysAgo(60, NOW), 'Delivered', 'qtr', 3, 100), //       $300: 90D and 12M
  order('NX-4', daysAgo(7, NOW), 'Delivered', 'edge', 20, 10), //       $200: exactly at the 7D start, which the window excludes
  order('NX-5', daysAgo(20, NOW), 'Shipped', 'mo', 2, 60), //           $120: 30D and up
  order('NX-6', daysAgo(3, NOW), 'Processing', 'wk', 1, 50), //         $50: every range
  order('NX-7', daysAgo(1, NOW), 'Cancelled', 'canc', 50, 100), //      $5000 but cancelled: never a sale
]

const ids = (list) => list.map((entry) => entry.product.id)

describe('getTopProducts with an Overview range', () => {
  it.each([
    ['7d', ['wk']],
    ['30d', ['edge', 'mo', 'wk']],
    ['90d', ['qtr', 'edge', 'mo', 'wk']],
    ['12m', ['yr', 'qtr', 'edge', 'mo', 'wk']],
  ])('%s ranks only the products sold in that window, by revenue', (rangeKey, expected) => {
    expect(ids(getTopProducts(ORDERS, CATALOG, 5, rangeKey, NOW))).toEqual(expected)
  })

  it('still ranks every order, all-time, when no range is given (the all-time leader differs from every range)', () => {
    const allTime = getTopProducts(ORDERS, CATALOG, 5)
    expect(ids(allTime)).toEqual(['old', 'yr', 'qtr', 'edge', 'mo'])
    ;['7d', '30d', '90d', '12m'].forEach((rangeKey) => {
      expect(getTopProducts(ORDERS, CATALOG, 5, rangeKey, NOW)[0].product.id).not.toBe('old')
    })
  })

  it('uses the window edges of the Overview metrics: the start instant is excluded, the end included', () => {
    expect(computeOverviewMetrics(ORDERS, '7d', NOW).orders.value).toBe(2) // NX-6 and the cancelled NX-7, not NX-4
    expect(ids(getTopProducts(ORDERS, CATALOG, 5, '7d', NOW))).not.toContain('edge')
    expect(computeOverviewMetrics(ORDERS, '30d', NOW).orders.value).toBe(4)
    expect(ids(getTopProducts(ORDERS, CATALOG, 5, '30d', NOW))).toContain('edge')

    const atNow = [order('NX-8', NOW, 'Delivered', 'wk', 1, 10)]
    expect(ids(getTopProducts(atNow, CATALOG, 5, '7d', NOW))).toEqual(['wk'])
  })

  it.each(['7d', '30d', '90d', '12m'])('%s covers exactly the revenue the Overview revenue card shows', (rangeKey) => {
    const listed = getTopProducts(ORDERS, CATALOG, 99, rangeKey, NOW).reduce((sum, entry) => sum + entry.revenue, 0)
    expect(listed).toBe(computeOverviewMetrics(ORDERS, rangeKey, NOW).revenue.value)
  })

  it('never counts a cancelled order, in any range', () => {
    ;['7d', '30d', '90d', '12m'].forEach((rangeKey) => {
      expect(ids(getTopProducts(ORDERS, CATALOG, 99, rangeKey, NOW))).not.toContain('canc')
    })
  })

  it('keeps the existing ranking output: revenue order, units, and bar shares relative to the leader', () => {
    const thirty = getTopProducts(ORDERS, CATALOG, 5, '30d', NOW)
    expect(thirty.map((entry) => entry.revenue)).toEqual([200, 120, 50])
    expect(thirty.map((entry) => entry.unitsSold)).toEqual([20, 2, 0]) // the last sale is still Processing: revenue, but no units sold yet
    expect(thirty.map((entry) => entry.share)).toEqual([1, 0.6, 0.25])
    expect(thirty[0].product).toBe(CATALOG.find((p) => p.id === 'edge'))
  })

  it('applies the display limit after filtering to the range', () => {
    expect(ids(getTopProducts(ORDERS, CATALOG, 2, '90d', NOW))).toEqual(['qtr', 'edge'])
    expect(ids(getTopProducts(ORDERS, CATALOG, 1, '12m', NOW))).toEqual(['yr'])
  })

  it('returns nothing when no product sold in the window', () => {
    const onlyOld = [ORDERS[0]]
    expect(getTopProducts(onlyOld, CATALOG, 5, '12m', NOW)).toEqual([])
    expect(getTopProducts([ORDERS[6]], CATALOG, 5, '7d', NOW)).toEqual([]) // only a cancelled order
    expect(getTopProducts([], CATALOG, 5, '7d', NOW)).toEqual([])
  })

  it('still drops a product that was deleted from the catalog', () => {
    const withoutEdge = CATALOG.filter((p) => p.id !== 'edge')
    expect(ids(getTopProducts(ORDERS, withoutEdge, 5, '30d', NOW))).toEqual(['mo', 'wk'])
  })

  it('falls back to the default range for an unknown key, like the Overview metrics', () => {
    expect(ids(getTopProducts(ORDERS, CATALOG, 5, 'nonsense', NOW))).toEqual(ids(getTopProducts(ORDERS, CATALOG, 5, '30d', NOW)))
  })
})
