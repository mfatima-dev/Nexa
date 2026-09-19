import { describe, expect, it } from 'vitest'
import { PRODUCTS } from './products.js'
import { ORDERS } from './orders.js'
import {
  getProductCatalogSummary,
  getProductSales,
  getProductStats,
  getProductSummary,
  getRecentActivity,
  getTopProducts,
} from './selectors.js'

const catalog = [
  { id: 'a', name: 'Alpha', category: 'Bags', price: 100, cost: 40, stock: 5, lowStockThreshold: 10, status: 'active' },
  { id: 'b', name: 'Beta', category: 'Tech', price: 50, cost: 20, stock: 0, lowStockThreshold: 10, status: 'active' },
  { id: 'c', name: 'Gamma', category: 'Travel', price: 20, cost: 10, stock: 100, lowStockThreshold: 10, status: 'active' },
  { id: 'd', name: 'Delta', category: 'Bags', price: 10, cost: 5, stock: 0, lowStockThreshold: 10, status: 'discontinued' },
]

function order(id, status, items) {
  return { id, status, customerId: 'c001', placedAt: '2026-06-01T00:00:00.000Z', total: 0, items }
}

const line = (productId, quantity, unitPrice) => ({ productId, productName: productId, quantity, unitPrice })

const ORDERS_FIXTURE = [
  order('1', 'Delivered', [line('a', 2, 100), line('c', 1, 20)]),
  order('2', 'Pending', [line('a', 1, 90)]), // sold at an older, lower price
  order('3', 'Cancelled', [line('a', 5, 100), line('b', 3, 50)]),
]

describe('getProductSales', () => {
  const sales = getProductSales(ORDERS_FIXTURE)

  it('sums units and revenue from order lines using the price captured on the order', () => {
    expect(sales.get('a')).toEqual({ unitsSold: 3, revenue: 290, orderCount: 2 })
    expect(sales.get('c')).toEqual({ unitsSold: 1, revenue: 20, orderCount: 1 })
  })

  it('ignores cancelled orders entirely', () => {
    expect(sales.has('b')).toBe(false)
  })
})

describe('getProductStats', () => {
  it('adds sales, stock level and margin to each product', () => {
    const stats = getProductStats(catalog, ORDERS_FIXTURE)
    const alpha = stats.find((e) => e.product.id === 'a')
    expect(alpha).toMatchObject({ unitsSold: 3, revenue: 290, orderCount: 2, stockLevel: 'Low stock' })
    expect(alpha.margin).toBeCloseTo(0.6)

    const beta = stats.find((e) => e.product.id === 'b')
    expect(beta).toMatchObject({ unitsSold: 0, revenue: 0, orderCount: 0, stockLevel: 'Out of stock' })
  })
})

describe('getProductSummary', () => {
  const summary = getProductSummary(catalog)

  it('counts products by status', () => {
    expect(summary).toMatchObject({ total: 4, active: 3, discontinued: 1 })
  })

  it('values inventory at cost across every product with stock', () => {
    // 5*40 + 0*20 + 100*10 + 0*5
    expect(summary.inventoryValue).toBe(1200)
    expect(summary.unitsInStock).toBe(105)
  })

  it('only raises stock alerts for active products', () => {
    // Alpha is low, Beta is out of stock; discontinued Delta (0 units) is ignored.
    expect(summary).toMatchObject({ lowStock: 1, outOfStock: 1 })
  })

  it('averages margin across active products only', () => {
    // (0.6 + 0.6 + 0.5) / 3
    expect(summary.averageMargin).toBeCloseTo(0.5667, 3)
  })

  it('handles an empty catalog', () => {
    expect(getProductSummary([])).toMatchObject({ total: 0, inventoryValue: 0, averageMargin: 0 })
  })
})

describe('getTopProducts / getRecentActivity follow the live catalog', () => {
  it('drops a product that was deleted from the catalog', () => {
    const withAlpha = getTopProducts(ORDERS_FIXTURE, catalog).map((e) => e.product.id)
    expect(withAlpha[0]).toBe('a')

    const withoutAlpha = getTopProducts(ORDERS_FIXTURE, catalog.filter((p) => p.id !== 'a')).map((e) => e.product.id)
    expect(withoutAlpha).not.toContain('a')
  })

  it('uses the current product name in restock events, and skips deleted products', () => {
    const restocked = getRecentActivity([], PRODUCTS.map((p) => (p.id === 'p01' ? { ...p, name: 'Renamed Pack' } : p)), 20)
    expect(restocked.some((e) => e.message.startsWith('Renamed Pack restocked'))).toBe(true)

    const withoutP01 = getRecentActivity([], PRODUCTS.filter((p) => p.id !== 'p01'), 20)
    expect(withoutP01.some((e) => e.message.includes('Urban Backpack'))).toBe(false)
  })
})

describe('getProductCatalogSummary', () => {
  it('counts the live catalog', () => {
    expect(getProductCatalogSummary(catalog)).toEqual({ total: 4, active: 3, discontinued: 1 })
  })
})

describe('seeded data consistency', () => {
  const ids = new Set(PRODUCTS.map((p) => p.id))

  it('references only catalog products from order lines, with matching name snapshots', () => {
    const names = new Map(PRODUCTS.map((p) => [p.id, p.name]))
    ORDERS.forEach((o) =>
      o.items.forEach((item) => {
        expect(ids.has(item.productId)).toBe(true)
        expect(item.productName).toBe(names.get(item.productId))
      }),
    )
  })

  it('captures the catalog price on every order line', () => {
    const prices = new Map(PRODUCTS.map((p) => [p.id, p.price]))
    ORDERS.forEach((o) => o.items.forEach((item) => expect(item.unitPrice).toBe(prices.get(item.productId))))
  })

  it('makes every order total equal the sum of its lines', () => {
    ORDERS.forEach((o) => {
      const sum = o.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
      expect(o.total).toBeCloseTo(sum, 2)
    })
  })

  it('never sells a product for less than it costs', () => {
    PRODUCTS.forEach((p) => expect(p.cost).toBeLessThanOrEqual(p.price))
  })

  it('reconciles product revenue with order revenue', () => {
    const productRevenue = getProductStats(PRODUCTS, ORDERS).reduce((sum, e) => sum + e.revenue, 0)
    const orderRevenue = ORDERS.filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0)
    expect(productRevenue).toBeCloseTo(orderRevenue, 0)
  })
})
