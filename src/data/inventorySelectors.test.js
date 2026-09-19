import { describe, expect, it } from 'vitest'
import { ORDERS } from './orders.js'
import { PRODUCTS } from './products.js'
import { RESTOCK_EVENTS } from './inventoryEvents.js'
import { SEED_INVENTORY_MOVEMENTS, seedInventoryMovements } from './inventoryMovements.js'
import {
  getInventoryStats,
  getInventoryStatus,
  getProductMovements,
  getRecentInventoryActivity,
} from './inventorySelectors.js'
import { getProductSummary } from './selectors.js'

const catalog = [
  { id: 'a', name: 'Alpha', category: 'Bags', price: 100, cost: 40, stock: 5, lowStockThreshold: 10, status: 'active' },
  { id: 'b', name: 'Beta', category: 'Tech', price: 50, cost: 20, stock: 0, lowStockThreshold: 10, status: 'active' },
  { id: 'c', name: 'Gamma', category: 'Travel', price: 20, cost: 10, stock: 100, lowStockThreshold: 10, status: 'active' },
  { id: 'd', name: 'Delta', category: 'Bags', price: 10, cost: 5, stock: 0, lowStockThreshold: 10, status: 'discontinued' },
]

const order = (id, status, items) => ({ id, status, customerId: 'c001', placedAt: '2026-06-01T00:00:00.000Z', total: 0, items })
const line = (productId, quantity) => ({ productId, productName: productId, quantity, unitPrice: 1 })

describe('getInventoryStats', () => {
  const stats = getInventoryStats(catalog, [order('1', 'Delivered', [line('a', 4)]), order('2', 'Cancelled', [line('a', 9)])])
  const byId = (id) => stats.find((entry) => entry.product.id === id)

  it('values stock at cost (on hand x unit cost)', () => {
    expect(byId('a').stockValue).toBe(200)
    expect(byId('c').stockValue).toBe(1000)
    expect(byId('b').stockValue).toBe(0)
  })

  it('counts units sold from non-cancelled orders', () => {
    expect(byId('a').unitsSold).toBe(4)
  })

  it('reports the stock status, treating discontinued products as discontinued rather than alerting', () => {
    expect(byId('a').status).toBe('Low stock')
    expect(byId('b').status).toBe('Out of stock')
    expect(byId('c').status).toBe('In stock')
    expect(byId('d').status).toBe('Discontinued')
    expect(getInventoryStatus(catalog[3], 'Out of stock')).toBe('Discontinued')
  })

  it('agrees with the Products summary on totals and alert counts', () => {
    const summary = getProductSummary(catalog)
    expect(stats.reduce((sum, entry) => sum + entry.stockValue, 0)).toBeCloseTo(summary.inventoryValue, 2)
    expect(stats.filter((entry) => entry.status === 'Low stock')).toHaveLength(summary.lowStock)
    expect(stats.filter((entry) => entry.status === 'Out of stock')).toHaveLength(summary.outOfStock)
  })
})

describe('getProductMovements', () => {
  const product = { id: 'a', stock: 100 }
  const ledger = [
    { id: 'm1', productId: 'a', reason: 'restock', change: 10, occurredAt: '2026-06-01T00:00:00.000Z' },
    { id: 'm2', productId: 'b', reason: 'restock', change: 99, occurredAt: '2026-06-02T00:00:00.000Z' },
    { id: 'm3', productId: 'a', reason: 'fulfillment', change: -3, occurredAt: '2026-06-02T00:00:00.000Z' },
    { id: 'm4', productId: 'a', reason: 'adjustment', change: -2, occurredAt: '2026-06-03T00:00:00.000Z' },
  ]

  it("returns only that product's movements, newest first", () => {
    expect(getProductMovements(ledger, product).map((m) => m.id)).toEqual(['m4', 'm3', 'm1'])
  })

  it('derives the balance after each movement by walking back from current stock', () => {
    const result = getProductMovements(ledger, product)
    expect(result.map((m) => m.balanceAfter)).toEqual([100, 102, 105])
  })

  it('orders movements with identical timestamps by the order they were recorded', () => {
    const tied = [
      { id: 'x1', productId: 'a', reason: 'restock', change: 5, occurredAt: '2026-06-01T00:00:00.000Z' },
      { id: 'x2', productId: 'a', reason: 'fulfillment', change: -1, occurredAt: '2026-06-01T00:00:00.000Z' },
    ]
    expect(getProductMovements(tied, { id: 'a', stock: 4 }).map((m) => m.id)).toEqual(['x2', 'x1'])
  })

  it('returns an empty list for a product with no movements', () => {
    expect(getProductMovements(ledger, { id: 'zzz', stock: 1 })).toEqual([])
  })
})

describe('getRecentInventoryActivity', () => {
  const ledger = [
    { id: 'r', productId: 'a', reason: 'restock', change: 12, occurredAt: '2026-06-01T00:00:00.000Z', detail: 'Stock received' },
    { id: 'j', productId: 'a', reason: 'adjustment', change: -3, occurredAt: '2026-06-02T00:00:00.000Z', detail: 'Damaged or lost' },
    { id: 'f', productId: 'c', reason: 'fulfillment', change: -2, occurredAt: '2026-06-03T00:00:00.000Z', detail: 'Order shipped', orderId: 'NX-1001' },
    { id: 'gone', productId: 'deleted', reason: 'restock', change: 1, occurredAt: '2026-06-04T00:00:00.000Z' },
  ]

  it('describes each kind of movement, newest first, and skips deleted products', () => {
    const feed = getRecentInventoryActivity(ledger, catalog)
    expect(feed.map((item) => item.id)).toEqual(['f', 'j', 'r'])
    expect(feed.map((item) => item.type)).toEqual(['inventory_fulfilled', 'inventory_adjusted', 'inventory_restocked'])
    expect(feed[0].message).toBe('Gamma: −2 for order NX-1001')
    expect(feed[1].message).toBe('Alpha: stock −3 (Damaged or lost)')
    expect(feed[2].message).toBe('Alpha: +12 units received')
  })

  it('respects the limit', () => {
    expect(getRecentInventoryActivity(ledger, catalog, 1)).toHaveLength(1)
  })
})

describe('seeded inventory ledger', () => {
  it('records every seeded restock', () => {
    const restocks = SEED_INVENTORY_MOVEMENTS.filter((m) => m.reason === 'restock')
    expect(restocks.map((m) => m.id)).toEqual(RESTOCK_EVENTS.map((e) => e.id))
    restocks.forEach((movement, i) => expect(movement.change).toBe(RESTOCK_EVENTS[i].quantity))
  })

  it('has exactly one fulfillment movement per line of every shipped order, and none for the rest', () => {
    const fulfillments = SEED_INVENTORY_MOVEMENTS.filter((m) => m.reason === 'fulfillment')
    const shippedLines = ORDERS.filter((o) => o.shippedAt).reduce((n, o) => n + o.items.length, 0)
    expect(fulfillments).toHaveLength(shippedLines)

    ORDERS.forEach((o) => {
      const mine = fulfillments.filter((m) => m.orderId === o.id)
      expect(mine).toHaveLength(o.shippedAt ? o.items.length : 0)
      mine.forEach((m) => {
        const item = o.items.find((i) => i.productId === m.productId)
        expect(m.change).toBe(-item.quantity)
      })
    })
  })

  it('never records movement in the future', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    const future = [{ ...ORDERS[0], shippedAt: '2026-06-20T00:00:00.000Z' }]
    const [movement] = seedInventoryMovements(future, [], now).filter((m) => m.reason === 'fulfillment')
    expect(movement.occurredAt).toBe(now.toISOString())
    SEED_INVENTORY_MOVEMENTS.forEach((m) => expect(new Date(m.occurredAt).getTime()).toBeLessThanOrEqual(Date.now()))
  })

  it('has unique ids and only references catalog products', () => {
    expect(new Set(SEED_INVENTORY_MOVEMENTS.map((m) => m.id)).size).toBe(SEED_INVENTORY_MOVEMENTS.length)
    const ids = new Set(PRODUCTS.map((p) => p.id))
    SEED_INVENTORY_MOVEMENTS.forEach((m) => expect(ids.has(m.productId)).toBe(true))
  })

  it('explains every seeded on-hand number: walking the ledger back never goes negative', () => {
    PRODUCTS.forEach((product) => {
      const history = getProductMovements(SEED_INVENTORY_MOVEMENTS, product)
      const opening = product.stock - history.reduce((sum, m) => sum + m.change, 0)
      expect(opening, `${product.name} opening stock`).toBeGreaterThanOrEqual(0)
      // The newest balance is always today's on-hand count.
      if (history.length > 0) expect(history[0].balanceAfter).toBe(product.stock)
    })
  })
})
