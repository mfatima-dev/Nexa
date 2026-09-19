import { describe, expect, it } from 'vitest'
import { CUSTOMERS } from './customers.js'
import { SEED_CUSTOMERS } from './customerSeed.js'
import { ORDERS } from './orders.js'
import { getCustomerStats, getCustomerSummary, getOrderStatusCounts } from './selectors.js'

// The seeded orders were reviewed and approved in Step 4. These values are deterministic (they
// don't depend on the clock), so any change to the order generator will fail here on purpose.
describe('approved Step 4 order dataset', () => {
  it('still has the approved size and status mix', () => {
    expect(getOrderStatusCounts(ORDERS)).toEqual({
      Total: 150,
      Pending: 9,
      Processing: 13,
      Shipped: 21,
      Delivered: 96,
      Cancelled: 11,
    })
  })

  it('still has the approved all-time revenue (non-cancelled orders)', () => {
    const revenue = ORDERS.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + order.total, 0)
    expect(revenue).toBeCloseTo(39645, 2)
  })

  it('numbers orders NX-1000 to NX-1149 in placement order', () => {
    expect(ORDERS[0].id).toBe('NX-1000')
    expect(ORDERS[149].id).toBe('NX-1149')
    for (let i = 1; i < ORDERS.length; i += 1) {
      expect(new Date(ORDERS[i].placedAt) >= new Date(ORDERS[i - 1].placedAt)).toBe(true)
    }
  })
})

describe('customer join dates are reconciled with order history', () => {
  const firstOrder = new Map()
  ORDERS.forEach((order) => {
    const placed = new Date(order.placedAt).getTime()
    if (!firstOrder.has(order.customerId) || placed < firstOrder.get(order.customerId)) {
      firstOrder.set(order.customerId, placed)
    }
  })

  it('never has a customer whose first order predates their join date', () => {
    CUSTOMERS.forEach((customer) => {
      if (firstOrder.has(customer.id)) {
        expect(firstOrder.get(customer.id)).toBeGreaterThanOrEqual(new Date(customer.joinedAt).getTime())
      }
    })
  })

  it('never has a customer who joined in the future', () => {
    CUSTOMERS.forEach((customer) => expect(new Date(customer.joinedAt).getTime()).toBeLessThanOrEqual(Date.now()))
  })

  it('changes only join dates: same customers, same order, same identity fields', () => {
    expect(CUSTOMERS).toHaveLength(SEED_CUSTOMERS.length)
    CUSTOMERS.forEach((customer, index) => {
      const seed = SEED_CUSTOMERS[index]
      expect({ ...customer, joinedAt: null }).toEqual({ ...seed, joinedAt: null })
    })
  })

  it('only ever moves a join date earlier, and leaves customers with no orders untouched', () => {
    CUSTOMERS.forEach((customer, index) => {
      const seed = SEED_CUSTOMERS[index]
      expect(new Date(customer.joinedAt).getTime()).toBeLessThanOrEqual(new Date(seed.joinedAt).getTime())
      if (!firstOrder.has(customer.id)) expect(customer.joinedAt).toBe(seed.joinedAt)
    })
  })

  it('keeps customer totals in step with the orders they came from', () => {
    const stats = getCustomerStats(ORDERS)
    const paid = ORDERS.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + order.total, 0)

    expect(stats.reduce((sum, entry) => sum + entry.orderCount, 0)).toBe(ORDERS.length)
    expect(getCustomerSummary(stats).totalRevenue).toBeCloseTo(paid, 2)
  })
})
