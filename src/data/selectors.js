import { ORDERS } from './orders.js'
import { PRODUCTS } from './products.js'
import { CUSTOMERS } from './customers.js'
import { RESTOCK_EVENTS } from './inventoryEvents.js'
import { RANGE_OPTIONS } from './ranges.js'
import { daysAgo, formatDate } from '../utils/date.js'

const productsById = new Map(PRODUCTS.map((product) => [product.id, product]))
const customersById = new Map(CUSTOMERS.map((customer) => [customer.id, customer]))

function getRangeConfig(rangeKey) {
  return RANGE_OPTIONS.find((option) => option.key === rangeKey) ?? RANGE_OPTIONS[1]
}

function withinWindow(dateStr, start, end) {
  const time = new Date(dateStr).getTime()
  return time > start.getTime() && time <= end.getTime()
}

function getOrdersInWindow(start, end) {
  return ORDERS.filter((order) => withinWindow(order.placedAt, start, end))
}

function sumRevenue(orders) {
  return orders.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + order.total, 0)
}

function getEarliestOrderDate() {
  return ORDERS.reduce((earliest, order) => {
    const placed = new Date(order.placedAt)
    return placed < earliest ? placed : earliest
  }, new Date())
}

/**
 * Metrics for the four Overview cards: current value vs. the immediately
 * preceding period of equal length. changePct is null when the dataset
 * doesn't extend far enough back to support a comparison (e.g. 12M).
 */
export function computeOverviewMetrics(rangeKey, now = new Date()) {
  const { days } = getRangeConfig(rangeKey)
  const currentEnd = now
  const currentStart = daysAgo(days, now)
  const previousEnd = currentStart
  const previousStart = daysAgo(days, currentStart)

  const currentOrders = getOrdersInWindow(currentStart, currentEnd)
  const previousOrders = getOrdersInWindow(previousStart, previousEnd)
  const earliestOrderDate = getEarliestOrderDate()
  const previousWindowHasData = previousStart >= earliestOrderDate || previousOrders.length > 0

  function change(current, previous) {
    if (!previousWindowHasData || previous === 0) return null
    return ((current - previous) / previous) * 100
  }

  const revenueCurrent = sumRevenue(currentOrders)
  const revenuePrevious = sumRevenue(previousOrders)

  const customersCurrent = new Set(currentOrders.map((order) => order.customerId)).size
  const customersPrevious = new Set(previousOrders.map((order) => order.customerId)).size

  return {
    revenue: { value: revenueCurrent, changePct: change(revenueCurrent, revenuePrevious) },
    orders: { value: currentOrders.length, changePct: change(currentOrders.length, previousOrders.length) },
    customers: { value: customersCurrent, changePct: change(customersCurrent, customersPrevious) },
  }
}

/**
 * Product catalog snapshot for the Products card. Not period-based — the
 * catalog doesn't have a "vs prior period" reading the way revenue/orders/
 * customers do, so this intentionally returns no changePct.
 */
export function getProductCatalogSummary() {
  const active = PRODUCTS.filter((product) => product.status === 'active').length
  const discontinued = PRODUCTS.filter((product) => product.status === 'discontinued').length
  return { total: PRODUCTS.length, active, discontinued }
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date) {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function buildDailySeries(orders, start, end) {
  const buckets = new Map()
  const cursor = startOfDay(start)
  const last = startOfDay(end)

  while (cursor <= last) {
    buckets.set(cursor.toISOString().slice(0, 10), 0)
    cursor.setDate(cursor.getDate() + 1)
  }

  orders.forEach((order) => {
    const key = order.placedAt.slice(0, 10)
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + order.total)
  })

  return Array.from(buckets.entries()).map(([key, value]) => ({
    label: formatDate(key, { month: 'short', day: 'numeric' }),
    value: Math.round(value),
  }))
}

function buildWeeklySeries(orders, start, end) {
  const buckets = new Map()
  const cursor = startOfWeek(start)
  const last = startOfWeek(end)

  while (cursor <= last) {
    buckets.set(cursor.toISOString().slice(0, 10), 0)
    cursor.setDate(cursor.getDate() + 7)
  }

  orders.forEach((order) => {
    const key = startOfWeek(new Date(order.placedAt)).toISOString().slice(0, 10)
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + order.total)
  })

  return Array.from(buckets.entries()).map(([key, value]) => ({
    label: formatDate(key, { month: 'short', day: 'numeric' }),
    value: Math.round(value),
  }))
}

function buildMonthlySeries(orders, start, end) {
  const buckets = new Map()
  const cursor = startOfMonth(start)
  const last = startOfMonth(end)

  while (cursor <= last) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, 0)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  orders.forEach((order) => {
    const placed = new Date(order.placedAt)
    const key = `${placed.getFullYear()}-${String(placed.getMonth() + 1).padStart(2, '0')}`
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + order.total)
  })

  return Array.from(buckets.entries()).map(([key, value]) => {
    const [year, month] = key.split('-')
    return {
      label: formatDate(new Date(Number(year), Number(month) - 1, 1), { month: 'short' }),
      value: Math.round(value),
    }
  })
}

/** Revenue series for the Revenue Overview chart, bucketed to fit the selected range. */
export function buildRevenueSeries(rangeKey, now = new Date()) {
  const { days } = getRangeConfig(rangeKey)
  const naiveStart = daysAgo(days, now)
  const earliestOrderDate = getEarliestOrderDate()
  // Never render empty buckets for a time before the business had any orders.
  const start = naiveStart > earliestOrderDate ? naiveStart : earliestOrderDate
  const orders = getOrdersInWindow(start, now).filter((order) => order.status !== 'Cancelled')

  if (rangeKey === '12m') return buildMonthlySeries(orders, start, now)
  if (rangeKey === '90d') return buildWeeklySeries(orders, start, now)
  return buildDailySeries(orders, start, now)
}

/** Best-selling products by revenue, ranked from real order line items. */
export function getTopProducts(limit = 5) {
  const salesByProduct = new Map()

  ORDERS.forEach((order) => {
    if (order.status === 'Cancelled') return
    order.items.forEach((item) => {
      const entry = salesByProduct.get(item.productId) ?? { unitsSold: 0, revenue: 0 }
      entry.unitsSold += item.quantity
      entry.revenue += item.quantity * item.unitPrice
      salesByProduct.set(item.productId, entry)
    })
  })

  const ranked = Array.from(salesByProduct.entries())
    .map(([productId, stats]) => ({
      product: productsById.get(productId),
      unitsSold: stats.unitsSold,
      revenue: Math.round(stats.revenue),
    }))
    .filter((entry) => entry.product)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)

  const maxRevenue = ranked[0]?.revenue ?? 1

  return ranked.map((entry) => ({ ...entry, share: entry.revenue / maxRevenue }))
}

/** Most recent orders with the customer name resolved for display. */
export function getRecentOrders(limit = 6) {
  return [...ORDERS]
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
    .slice(0, limit)
    .map((order) => ({
      ...order,
      customerName: customersById.get(order.customerId)?.name ?? 'Unknown customer',
    }))
}

/** Recent activity feed: order lifecycle events plus inventory restocks, newest first. */
export function getRecentActivity(limit = 8) {
  const events = []

  ORDERS.forEach((order) => {
    const customerName = customersById.get(order.customerId)?.name ?? 'a customer'

    events.push({
      id: `${order.id}-placed`,
      type: 'order_placed',
      message: `Order ${order.id} placed by ${customerName}`,
      occurredAt: order.placedAt,
    })

    if (order.shippedAt) {
      events.push({
        id: `${order.id}-shipped`,
        type: 'order_shipped',
        message: `Order ${order.id} shipped to ${customerName}`,
        occurredAt: order.shippedAt,
      })
    }

    if (order.deliveredAt) {
      events.push({
        id: `${order.id}-delivered`,
        type: 'order_delivered',
        message: `Order ${order.id} delivered to ${customerName}`,
        occurredAt: order.deliveredAt,
      })
    }
  })

  RESTOCK_EVENTS.forEach((event) => {
    const product = productsById.get(event.productId)
    events.push({
      id: event.id,
      type: 'inventory_restocked',
      message: `${product?.name ?? 'Product'} restocked (+${event.quantity} units)`,
      occurredAt: event.occurredAt,
    })
  })

  return events.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, limit)
}
