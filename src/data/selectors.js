import { CUSTOMERS } from './customers.js'
import { RANGE_OPTIONS } from './ranges.js'
import { getMargin, getStockLevel } from './productRules.js'
import { daysAgo, formatDate } from '../utils/date.js'

const customersById = new Map(CUSTOMERS.map((customer) => [customer.id, customer]))

export function getCustomerById(customerId) {
  return customersById.get(customerId) ?? null
}

export function getRangeConfig(rangeKey) {
  return RANGE_OPTIONS.find((option) => option.key === rangeKey) ?? RANGE_OPTIONS[1]
}

export function withinWindow(dateStr, start, end) {
  const time = new Date(dateStr).getTime()
  return time > start.getTime() && time <= end.getTime()
}

export function getOrdersInWindow(orders, start, end) {
  return orders.filter((order) => withinWindow(order.placedAt, start, end))
}

function sumRevenue(orders) {
  return orders.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + order.total, 0)
}

function getEarliestOrderDate(orders) {
  return orders.reduce((earliest, order) => {
    const placed = new Date(order.placedAt)
    return placed < earliest ? placed : earliest
  }, new Date())
}

/**
 * Metrics for the four Overview cards: current value vs. the immediately
 * preceding period of equal length. changePct is null when the dataset
 * doesn't extend far enough back to support a comparison (e.g. 12M).
 */
export function computeOverviewMetrics(orders, rangeKey, now = new Date()) {
  const { days } = getRangeConfig(rangeKey)
  const currentEnd = now
  const currentStart = daysAgo(days, now)
  const previousEnd = currentStart
  const previousStart = daysAgo(days, currentStart)

  const currentOrders = getOrdersInWindow(orders, currentStart, currentEnd)
  const previousOrders = getOrdersInWindow(orders, previousStart, previousEnd)
  const earliestOrderDate = getEarliestOrderDate(orders)
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
export function getProductCatalogSummary(products) {
  const active = products.filter((product) => product.status === 'active').length
  const discontinued = products.filter((product) => product.status === 'discontinued').length
  return { total: products.length, active, discontinued }
}

/**
 * Sales per product id, from real order lines. Cancelled orders don't count as sales.
 * Uses the unit price captured on the order, so later price edits never rewrite history.
 */
export function getProductSales(orders) {
  const sales = new Map()

  orders.forEach((order) => {
    if (order.status === 'Cancelled') return
    order.items.forEach((item) => {
      const entry = sales.get(item.productId) ?? { unitsSold: 0, revenue: 0, orderCount: 0 }
      entry.unitsSold += item.quantity
      entry.revenue += item.quantity * item.unitPrice
      entry.orderCount += 1
      sales.set(item.productId, entry)
    })
  })

  return sales
}

/** One entry per product with its derived sales, stock level and margin. */
export function getProductStats(products, orders) {
  const sales = getProductSales(orders)

  return products.map((product) => {
    const sold = sales.get(product.id)
    return {
      product,
      unitsSold: sold?.unitsSold ?? 0,
      revenue: roundCurrency(sold?.revenue ?? 0),
      orderCount: sold?.orderCount ?? 0,
      stockLevel: getStockLevel(product),
      margin: getMargin(product),
    }
  })
}

/** Headline numbers for the Products page. Low/out-of-stock alerts only concern active products. */
export function getProductSummary(products) {
  const active = products.filter((product) => product.status === 'active')
  const levels = active.map(getStockLevel)
  const margins = active.map(getMargin)

  return {
    total: products.length,
    active: active.length,
    discontinued: products.length - active.length,
    unitsInStock: products.reduce((sum, product) => sum + product.stock, 0),
    inventoryValue: roundCurrency(products.reduce((sum, product) => sum + product.stock * product.cost, 0)),
    lowStock: levels.filter((level) => level === 'Low stock').length,
    outOfStock: levels.filter((level) => level === 'Out of stock').length,
    averageMargin: margins.length ? margins.reduce((sum, value) => sum + value, 0) / margins.length : 0,
  }
}

/** Order counts by status, for the Orders page summary strip. */
export function getOrderStatusCounts(orders) {
  const counts = { Total: orders.length, Pending: 0, Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 }
  orders.forEach((order) => {
    if (counts[order.status] === undefined) return
    counts[order.status] += 1
  })
  return counts
}

// A customer is "Active" if they placed an order within this many days.
export const ACTIVE_CUSTOMER_WINDOW_DAYS = 90

function roundCurrency(value) {
  return Number(value.toFixed(2))
}

/**
 * Per-customer statistics computed from the live orders.
 *  - orderCount: every order the customer placed (matches the Orders page)
 *  - totalSpent / averageOrderValue: exclude cancelled orders (matches Overview revenue)
 *  - status: Active (ordered recently) | Inactive (ordered, but not recently) | No orders
 */
export function getCustomerStats(orders, now = new Date()) {
  const ordersByCustomer = new Map()
  orders.forEach((order) => {
    const list = ordersByCustomer.get(order.customerId) ?? []
    list.push(order)
    ordersByCustomer.set(order.customerId, list)
  })

  const activeCutoff = daysAgo(ACTIVE_CUSTOMER_WINDOW_DAYS, now)

  return CUSTOMERS.map((customer) => {
    const customerOrders = ordersByCustomer.get(customer.id) ?? []
    const paidOrders = customerOrders.filter((order) => order.status !== 'Cancelled')
    const totalSpent = roundCurrency(paidOrders.reduce((sum, order) => sum + order.total, 0))

    const lastOrderAt = customerOrders.reduce(
      (latest, order) => (!latest || new Date(order.placedAt) > new Date(latest) ? order.placedAt : latest),
      null,
    )

    let status = 'No orders'
    if (lastOrderAt) status = new Date(lastOrderAt) >= activeCutoff ? 'Active' : 'Inactive'

    return {
      customer,
      orderCount: customerOrders.length,
      totalSpent,
      averageOrderValue: paidOrders.length ? roundCurrency(totalSpent / paidOrders.length) : 0,
      lastOrderAt,
      status,
    }
  })
}

/** Headline numbers for the Customers page, derived from getCustomerStats output. */
export function getCustomerSummary(stats) {
  const purchasingCustomers = stats.filter((entry) => entry.totalSpent > 0).length
  const totalRevenue = roundCurrency(stats.reduce((sum, entry) => sum + entry.totalSpent, 0))

  return {
    totalCustomers: stats.length,
    customersWithOrders: stats.filter((entry) => entry.orderCount > 0).length,
    activeCustomers: stats.filter((entry) => entry.status === 'Active').length,
    totalRevenue,
    averageCustomerValue: purchasingCustomers ? roundCurrency(totalRevenue / purchasingCustomers) : 0,
  }
}

/** A customer's orders, newest first. */
export function getCustomerOrders(orders, customerId) {
  return orders
    .filter((order) => order.customerId === customerId)
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
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
export function buildRevenueSeries(orders, rangeKey, now = new Date()) {
  const { days } = getRangeConfig(rangeKey)
  const naiveStart = daysAgo(days, now)
  const earliestOrderDate = getEarliestOrderDate(orders)
  // Never render empty buckets for a time before the business had any orders.
  const start = naiveStart > earliestOrderDate ? naiveStart : earliestOrderDate
  const windowOrders = getOrdersInWindow(orders, start, now).filter((order) => order.status !== 'Cancelled')

  if (rangeKey === '12m') return buildMonthlySeries(windowOrders, start, now)
  if (rangeKey === '90d') return buildWeeklySeries(windowOrders, start, now)
  return buildDailySeries(windowOrders, start, now)
}

/** Best-selling products by revenue. Products deleted from the catalog no longer appear. */
export function getTopProducts(orders, products, limit = 5) {
  const productsById = new Map(products.map((product) => [product.id, product]))

  const ranked = Array.from(getProductSales(orders).entries())
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
export function getRecentOrders(orders, limit = 6) {
  return [...orders]
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
    .slice(0, limit)
    .map((order) => ({
      ...order,
      customerName: customersById.get(order.customerId)?.name ?? 'Unknown customer',
    }))
}

/** Recent activity feed: order lifecycle events plus inventory restocks, newest first. */
export function getRecentActivity(orders, products, movements, limit = 8) {
  const events = []
  const productsById = new Map(products.map((product) => [product.id, product]))

  orders.forEach((order) => {
    const customerName = customersById.get(order.customerId)?.name ?? 'a customer'

    events.push({
      id: `${order.id}-placed`,
      type: 'order_placed',
      message: `Order ${order.id} placed by ${customerName}`,
      occurredAt: order.placedAt,
    })

    if (order.processingAt) {
      events.push({
        id: `${order.id}-processing`,
        type: 'order_processing',
        message: `Order ${order.id} moved to processing`,
        occurredAt: order.processingAt,
      })
    }

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

    if (order.cancelledAt) {
      events.push({
        id: `${order.id}-cancelled`,
        type: 'order_cancelled',
        message: `Order ${order.id} was cancelled`,
        occurredAt: order.cancelledAt,
      })
    }
  })

  // Restocks come from the live inventory ledger, so ones recorded on the Inventory page show up too.
  movements.forEach((movement) => {
    if (movement.reason !== 'restock') return
    const product = productsById.get(movement.productId)
    if (!product) return // the product was deleted from the catalog
    events.push({
      id: movement.id,
      type: 'inventory_restocked',
      message: `${product.name} restocked (+${movement.change} units)`,
      occurredAt: movement.occurredAt,
    })
  })

  return events.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, limit)
}
