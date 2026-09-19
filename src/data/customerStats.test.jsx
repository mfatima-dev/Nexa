import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { CUSTOMERS } from './customers.js'
import { ORDERS } from './orders.js'
import { getCustomerOrders, getCustomerStats, getCustomerSummary } from './selectors.js'
import { OrdersProvider } from '../context/OrdersContext.jsx'
import { useOrders } from '../context/useOrders.js'

const NOW = new Date('2026-06-15T12:00:00.000Z')

function order(id, customerId, status, total, placedAt) {
  return { id, customerId, status, placedAt, total, items: [], shippedAt: null, deliveredAt: null }
}

const CRAFTED = [
  order('NX-1', 'c001', 'Delivered', 100, '2026-06-10T12:00:00.000Z'),
  order('NX-2', 'c001', 'Cancelled', 50, '2026-06-12T12:00:00.000Z'),
  order('NX-3', 'c001', 'Pending', 60, '2026-06-14T12:00:00.000Z'),
  order('NX-4', 'c002', 'Delivered', 200, '2026-01-01T12:00:00.000Z'),
]

function statsFor(stats, customerId) {
  return stats.find((entry) => entry.customer.id === customerId)
}

describe('getCustomerStats', () => {
  const stats = getCustomerStats(CRAFTED, NOW)

  it('returns one entry per customer', () => {
    expect(stats).toHaveLength(CUSTOMERS.length)
  })

  it('counts every order but excludes cancelled orders from spend and average', () => {
    const entry = statsFor(stats, 'c001')
    expect(entry.orderCount).toBe(3)
    expect(entry.totalSpent).toBe(160)
    expect(entry.averageOrderValue).toBe(80)
  })

  it('reports the most recent order date, including cancelled orders', () => {
    expect(statsFor(stats, 'c001').lastOrderAt).toBe('2026-06-14T12:00:00.000Z')
  })

  it('derives status from recent activity', () => {
    expect(statsFor(stats, 'c001').status).toBe('Active')
    expect(statsFor(stats, 'c002').status).toBe('Inactive')
    expect(statsFor(stats, 'c003').status).toBe('No orders')
  })

  it('handles customers with no orders', () => {
    expect(statsFor(stats, 'c003')).toMatchObject({
      orderCount: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      lastOrderAt: null,
    })
  })
})

describe('getCustomerSummary', () => {
  it('summarises customers, activity and revenue', () => {
    const summary = getCustomerSummary(getCustomerStats(CRAFTED, NOW))
    expect(summary.totalCustomers).toBe(CUSTOMERS.length)
    expect(summary.customersWithOrders).toBe(2)
    expect(summary.activeCustomers).toBe(1)
    expect(summary.totalRevenue).toBe(360)
    // 360 across the 2 customers who actually spent money
    expect(summary.averageCustomerValue).toBe(180)
  })

  it('returns zeros when there are no orders', () => {
    const summary = getCustomerSummary(getCustomerStats([], NOW))
    expect(summary).toMatchObject({ customersWithOrders: 0, activeCustomers: 0, totalRevenue: 0, averageCustomerValue: 0 })
  })
})

describe('getCustomerOrders', () => {
  it("returns only that customer's orders, newest first", () => {
    expect(getCustomerOrders(CRAFTED, 'c001').map((o) => o.id)).toEqual(['NX-3', 'NX-2', 'NX-1'])
    expect(getCustomerOrders(CRAFTED, 'c003')).toEqual([])
  })
})

describe('seeded dataset consistency', () => {
  it('assigns every order to a real customer', () => {
    const ids = new Set(CUSTOMERS.map((c) => c.id))
    ORDERS.forEach((o) => expect(ids.has(o.customerId)).toBe(true))
  })

  it('never has an order placed before its customer joined', () => {
    const joined = new Map(CUSTOMERS.map((c) => [c.id, new Date(c.joinedAt)]))
    ORDERS.forEach((o) => expect(new Date(o.placedAt) >= joined.get(o.customerId)).toBe(true))
  })

  it('reconciles customer totals with the Orders data', () => {
    const stats = getCustomerStats(ORDERS)
    const orderCount = stats.reduce((sum, entry) => sum + entry.orderCount, 0)
    const spent = stats.reduce((sum, entry) => sum + entry.totalSpent, 0)
    const paidRevenue = ORDERS.filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0)

    expect(orderCount).toBe(ORDERS.length)
    expect(spent).toBeCloseTo(paidRevenue, 2)
  })
})

describe('customer stats follow the shared orders state', () => {
  it('drops a cancelled order from spend but keeps it in the order count', () => {
    const { result } = renderHook(
      () => {
        const { orders, updateOrderStatus } = useOrders()
        return { stats: getCustomerStats(orders), updateOrderStatus, orders }
      },
      { wrapper: OrdersProvider },
    )

    const target = result.current.orders.find((o) => o.status === 'Pending')
    const before = statsFor(result.current.stats, target.customerId)

    act(() => result.current.updateOrderStatus(target.id, 'Cancelled'))

    const after = statsFor(result.current.stats, target.customerId)
    expect(after.orderCount).toBe(before.orderCount)
    expect(after.totalSpent).toBeCloseTo(before.totalSpent - target.total, 2)
  })
})
