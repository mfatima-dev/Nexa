import { CUSTOMERS } from './customers.js'
import { getInventoryStatus } from './inventorySelectors.js'
import { getStockLevel } from './productRules.js'
import { PRODUCT_CATEGORIES } from './products.js'
import { getOrdersInWindow, getProductSales, getRangeConfig, withinWindow } from './selectors.js'
import { daysAgo, formatDate } from '../utils/date.js'
import { formatCurrency } from '../utils/format.js'

/**
 * Analytics selectors. Everything is derived from the shared orders, products and customers, and
 * follows the same rules as the rest of Nexa:
 *  - the window is (now - N days, now], exactly as on the Overview page;
 *  - revenue, average order value, units sold and product/category sales exclude cancelled orders;
 *  - "orders" counts every order placed (as on the Orders and Overview pages), with the cancelled
 *    ones reported separately so nothing is hidden.
 */

const RANGE_TITLES = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
}

const PREVIOUS_TITLES = {
  '7d': 'previous 7 days',
  '30d': 'previous 30 days',
  '90d': 'previous 90 days',
  '12m': 'previous 12 months',
}

const GRANULARITY = { '7d': 'day', '30d': 'day', '90d': 'week', '12m': 'month' }

export const REMOVED_PRODUCTS_LABEL = 'Removed products'

function roundCurrency(value) {
  return Number(value.toFixed(2))
}

function isSold(order) {
  return order.status !== 'Cancelled'
}

/** The current window and the equally long window right before it. */
export function getAnalyticsWindow(rangeKey, now = new Date()) {
  const { key, days } = getRangeConfig(rangeKey)
  const start = daysAgo(days, now)

  return {
    rangeKey: key,
    days,
    title: RANGE_TITLES[key],
    previousTitle: PREVIOUS_TITLES[key],
    granularity: GRANULARITY[key],
    start,
    end: now,
    previousStart: daysAgo(days, start),
    previousEnd: start,
    periodLabel: formatPeriod(start, now),
  }
}

// The year is shown on the start date only when the range crosses a year boundary.
function formatPeriod(start, end) {
  const withYear = { month: 'short', day: 'numeric', year: 'numeric' }
  const from = start.getFullYear() === end.getFullYear() ? formatDate(start) : formatDate(start, withYear)
  return `${from} – ${formatDate(end, withYear)}`
}

function earliestTime(items, field) {
  return items.reduce((earliest, item) => Math.min(earliest, new Date(item[field]).getTime()), Infinity)
}

/** Whether the previous period is a fair comparison: it doesn't start before the first order, or has orders. */
function ordersComparable(orders, period) {
  const hasOrders = getOrdersInWindow(orders, period.previousStart, period.previousEnd).length > 0
  return period.previousStart.getTime() >= earliestTime(orders, 'placedAt') || hasOrders
}

function summarizeOrders(orders) {
  const sold = orders.filter(isSold)
  const revenue = roundCurrency(sold.reduce((sum, order) => sum + order.total, 0))

  return {
    revenue,
    placed: orders.length,
    cancelled: orders.length - sold.length,
    soldCount: sold.length,
    unitsSold: sold.reduce((sum, order) => sum + order.items.reduce((units, item) => units + item.quantity, 0), 0),
    averageOrderValue: sold.length ? roundCurrency(revenue / sold.length) : 0,
  }
}

/**
 * Headline numbers for the selected range, each with its change against the previous period of the
 * same length. changePct is null when there is nothing to compare against: the previous period
 * starts before the data does, or its value is zero.
 */
export function getAnalyticsMetrics(orders, customers, rangeKey, now = new Date()) {
  const period = getAnalyticsWindow(rangeKey, now)

  const current = summarizeOrders(getOrdersInWindow(orders, period.start, period.end))
  const previous = summarizeOrders(getOrdersInWindow(orders, period.previousStart, period.previousEnd))
  const ordersHavePrevious = ordersComparable(orders, period)

  const newCustomers = customers.filter((customer) => withinWindow(customer.joinedAt, period.start, period.end)).length
  const previousNewCustomers = customers.filter((customer) =>
    withinWindow(customer.joinedAt, period.previousStart, period.previousEnd),
  ).length
  const customersHavePrevious =
    period.previousStart.getTime() >= earliestTime(customers, 'joinedAt') || previousNewCustomers > 0

  const change = (value, before, hasPrevious) => (!hasPrevious || before === 0 ? null : ((value - before) / before) * 100)
  // `previous` is the value for the previous period, or null when there is no comparable period.
  const compared = (value, before, hasPrevious) => ({
    value,
    previous: hasPrevious ? before : null,
    changePct: change(value, before, hasPrevious),
  })

  return {
    period,
    revenue: compared(current.revenue, previous.revenue, ordersHavePrevious),
    orders: {
      ...compared(current.placed, previous.placed, ordersHavePrevious),
      cancelled: current.cancelled,
    },
    averageOrderValue: compared(current.averageOrderValue, previous.averageOrderValue, ordersHavePrevious),
    unitsSold: compared(current.unitsSold, previous.unitsSold, ordersHavePrevious),
    customers: {
      newCustomers,
      previous: customersHavePrevious ? previousNewCustomers : null,
      total: customers.filter((customer) => new Date(customer.joinedAt).getTime() <= period.end.getTime()).length,
      changePct: change(newCustomers, previousNewCustomers, customersHavePrevious),
    },
  }
}

// ---- Time series -------------------------------------------------------------------------------

const pad = (number) => String(number).padStart(2, '0')

// Buckets are calendar days / weeks (Monday start) / months in local time, keyed by their first day.
function bucketKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function bucketStart(input, granularity) {
  const date = new Date(input)
  const day = date.getDay()
  if (granularity === 'week') return new Date(date.getFullYear(), date.getMonth(), date.getDate() + (day === 0 ? -6 : 1 - day))
  if (granularity === 'month') return new Date(date.getFullYear(), date.getMonth(), 1)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function nextBucketStart(start, granularity) {
  if (granularity === 'week') return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
  if (granularity === 'month') return new Date(start.getFullYear(), start.getMonth() + 1, 1)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
}

function bucketLabels(start, granularity) {
  if (granularity === 'month') {
    return {
      label: `${formatDate(start, { month: 'short' })} ’${String(start.getFullYear()).slice(2)}`,
      tooltipLabel: formatDate(start, { month: 'long', year: 'numeric' }),
    }
  }
  const short = formatDate(start, { month: 'short', day: 'numeric' })
  if (granularity === 'week') return { label: short, tooltipLabel: `Week of ${short}` }
  return { label: short, tooltipLabel: formatDate(start, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) }
}

/**
 * One point per day / week / month across the range (days for 7D and 30D, weeks for 90D, months
 * for 12M). The first and last periods can be partial. The series starts no earlier than the first
 * order or customer, so it never shows empty periods from before the business existed.
 *
 * Every order and customer in the window lands in exactly one point, so the totals of each field
 * equal the matching headline metric.
 */
export function buildAnalyticsSeries(orders, customers, rangeKey, now = new Date()) {
  const period = getAnalyticsWindow(rangeKey, now)
  const { granularity } = period

  const dataStart = Math.min(earliestTime(orders, 'placedAt'), earliestTime(customers, 'joinedAt'))
  const seriesStart = Number.isFinite(dataStart) && dataStart > period.start.getTime() ? new Date(dataStart) : period.start

  const buckets = new Map()
  const ordered = []
  for (
    let cursor = bucketStart(seriesStart, granularity);
    cursor.getTime() <= period.end.getTime();
    cursor = nextBucketStart(cursor, granularity)
  ) {
    const next = nextBucketStart(cursor, granularity)
    const bucket = {
      key: bucketKey(cursor),
      ...bucketLabels(cursor, granularity),
      revenue: 0,
      orders: 0,
      activeOrders: 0,
      cancelled: 0,
      unitsSold: 0,
      newCustomers: 0,
      totalCustomers: 0,
      lastMoment: Math.min(next.getTime() - 1, period.end.getTime()),
    }
    buckets.set(bucket.key, bucket)
    ordered.push(bucket)
  }

  getOrdersInWindow(orders, period.start, period.end).forEach((order) => {
    const bucket = buckets.get(bucketKey(bucketStart(order.placedAt, granularity)))
    if (!bucket) return
    bucket.orders += 1
    if (!isSold(order)) {
      bucket.cancelled += 1
      return
    }
    bucket.activeOrders += 1
    bucket.revenue += order.total
    bucket.unitsSold += order.items.reduce((units, item) => units + item.quantity, 0)
  })

  customers.forEach((customer) => {
    if (!withinWindow(customer.joinedAt, period.start, period.end)) return
    const bucket = buckets.get(bucketKey(bucketStart(customer.joinedAt, granularity)))
    if (bucket) bucket.newCustomers += 1
  })

  const joinTimes = customers.map((customer) => new Date(customer.joinedAt).getTime())
  return ordered.map(({ lastMoment, ...bucket }) => ({
    ...bucket,
    revenue: roundCurrency(bucket.revenue),
    totalCustomers: joinTimes.filter((time) => time <= lastMoment).length,
  }))
}

// ---- Products and categories -------------------------------------------------------------------

/**
 * Best-selling products by revenue within the range. Products removed from the catalog are left
 * out. Each entry also carries the product's current stock status, from the same shared products
 * that Inventory uses, so a best seller that is running low is visible from here.
 *  - share: revenue relative to the best seller (for bar widths)
 *  - revenueShare: fraction of all revenue in the range
 */
export function getTopProductsInRange(orders, products, rangeKey, limit = 5, now = new Date()) {
  const period = getAnalyticsWindow(rangeKey, now)
  const productsById = new Map(products.map((product) => [product.id, product]))
  const sales = getProductSales(getOrdersInWindow(orders, period.start, period.end))
  const totalRevenue = Array.from(sales.values()).reduce((sum, entry) => sum + entry.revenue, 0)

  const ranked = Array.from(sales.entries())
    .map(([productId, entry]) => ({
      product: productsById.get(productId),
      unitsSold: entry.unitsSold,
      revenue: roundCurrency(entry.revenue),
    }))
    .filter((entry) => entry.product)
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold || a.product.name.localeCompare(b.product.name))
    .slice(0, limit)

  const maxRevenue = ranked[0]?.revenue || 1
  return ranked.map((entry) => ({
    ...entry,
    share: entry.revenue / maxRevenue,
    revenueShare: totalRevenue ? entry.revenue / totalRevenue : 0,
    stock: entry.product.stock,
    stockStatus: getInventoryStatus(entry.product, getStockLevel(entry.product)),
  }))
}

/**
 * Sales by product category within the range. Every catalog category is listed (zero rows sort
 * last). Sales of products deleted from the catalog have no category, so they're grouped under
 * "Removed products" (shown only when there are any) and the rows always add up to total revenue.
 *  - share: the category's fraction of revenue for the range
 *  - previousRevenue / changePct: the same category in the previous period (null when that period
 *    isn't a fair comparison, and changePct is also null when the category had no sales then)
 */
export function getCategoryPerformance(orders, products, rangeKey, now = new Date()) {
  const period = getAnalyticsWindow(rangeKey, now)
  const categoryOf = new Map(products.map((product) => [product.id, product.category]))
  const categoryFor = (productId) => categoryOf.get(productId) ?? REMOVED_PRODUCTS_LABEL

  const rows = new Map()
  const row = (category) => {
    if (!rows.has(category)) rows.set(category, { category, revenue: 0, unitsSold: 0, previousRevenue: 0 })
    return rows.get(category)
  }
  PRODUCT_CATEGORIES.forEach(row)
  products.forEach((product) => row(product.category))

  getProductSales(getOrdersInWindow(orders, period.start, period.end)).forEach((sales, productId) => {
    const entry = row(categoryFor(productId))
    entry.revenue += sales.revenue
    entry.unitsSold += sales.unitsSold
  })

  const comparable = ordersComparable(orders, period)
  if (comparable) {
    getProductSales(getOrdersInWindow(orders, period.previousStart, period.previousEnd)).forEach((sales, productId) => {
      // Only categories still on the list are compared; a removed product's earlier sales aren't chased.
      if (rows.has(categoryFor(productId))) rows.get(categoryFor(productId)).previousRevenue += sales.revenue
    })
  }

  const removed = rows.get(REMOVED_PRODUCTS_LABEL)
  if (removed && removed.unitsSold === 0) rows.delete(REMOVED_PRODUCTS_LABEL)

  const list = Array.from(rows.values()).map((entry) => ({
    ...entry,
    revenue: roundCurrency(entry.revenue),
    previousRevenue: comparable ? roundCurrency(entry.previousRevenue) : null,
  }))
  const total = list.reduce((sum, entry) => sum + entry.revenue, 0)

  return list
    .map((entry) => ({
      ...entry,
      share: total ? entry.revenue / total : 0,
      changePct: entry.previousRevenue ? ((entry.revenue - entry.previousRevenue) / entry.previousRevenue) * 100 : null,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold || a.category.localeCompare(b.category))
}

// ---- Highlights --------------------------------------------------------------------------------

const MINUS = '−'
const signedPercent = (pct) => `${pct < 0 ? MINUS : '+'}${Math.abs(pct).toFixed(1)}%`
const signedCurrency = (amount) => `${amount < 0 ? MINUS : '+'}${formatCurrency(Math.abs(amount))}`
const plural = (count, one, many) => (count === 1 ? one : many)

function revenueTrend({ metrics, period }) {
  const { revenue, orders, averageOrderValue } = metrics
  const now = formatCurrency(revenue.value)

  if (revenue.previous === null) {
    return { id: 'revenue-trend', tone: 'neutral', text: `Revenue is ${now} for the ${period.title.toLowerCase()}. There is no earlier period on record to compare it with.` }
  }
  if (revenue.changePct === null) {
    return { id: 'revenue-trend', tone: 'neutral', text: `Revenue is ${now}. The ${period.previousTitle} had no revenue to compare with.` }
  }

  const direction = revenue.changePct === 0 ? 'flat' : revenue.changePct > 0 ? 'up' : 'down'
  const lead = `Revenue is ${direction === 'flat' ? 'flat' : `${direction} ${Math.abs(revenue.changePct).toFixed(1)}%`} on the ${period.previousTitle} (${formatCurrency(revenue.previous)} to ${now}).`
  const mix =
    direction !== 'flat' && orders.changePct !== null && averageOrderValue.changePct !== null
      ? ` The change is driven mainly by ${Math.abs(orders.changePct) >= Math.abs(averageOrderValue.changePct) ? 'order volume' : 'order size'}: orders are ${signedPercent(orders.changePct)} and average order value is ${signedPercent(averageOrderValue.changePct)}.`
      : ''

  return { id: 'revenue-trend', tone: direction === 'up' ? 'positive' : direction === 'down' ? 'negative' : 'neutral', text: lead + mix }
}

function categoryHighlights({ categories, period }) {
  const highlights = []
  const leader = categories[0]
  if (!leader || leader.revenue <= 0) return highlights

  highlights.push({
    id: 'category-leader',
    tone: 'neutral',
    text: `${leader.category} is the top category with ${formatCurrency(leader.revenue)}, ${(leader.share * 100).toFixed(1)}% of revenue.`,
  })

  const moves = categories
    .filter((entry) => entry.previousRevenue !== null)
    .map((entry) => ({ entry, delta: entry.revenue - entry.previousRevenue }))
    .filter(({ delta }) => Math.abs(delta) >= 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.entry.category.localeCompare(b.entry.category))
  if (moves[0]) {
    const { entry, delta } = moves[0]
    highlights.push({
      id: 'category-mover',
      tone: delta > 0 ? 'positive' : 'negative',
      text: `${entry.category} moved the most: ${signedCurrency(delta)} against the ${period.previousTitle}.`,
    })
  }
  return highlights
}

function productHighlights({ topProducts }) {
  if (!topProducts.length) return {}

  let concentration = null
  if (topProducts.length >= 3) {
    const share = topProducts.slice(0, 3).reduce((sum, entry) => sum + entry.revenueShare, 0)
    concentration = { id: 'concentration', tone: 'neutral', text: `Your top 3 products bring in ${(share * 100).toFixed(1)}% of revenue.` }
  }

  const atRisk = topProducts.filter((entry) => entry.stockStatus === 'Low stock' || entry.stockStatus === 'Out of stock')
  const stock = atRisk.length
    ? {
        id: 'stock-risk',
        tone: 'warning',
        text: `${atRisk.length} top-selling ${plural(atRisk.length, 'product needs', 'products need')} restocking: ${atRisk
          .map((entry) => `${entry.product.name} (${entry.stock > 0 ? `${entry.stock} left` : 'out of stock'})`)
          .join(', ')}.`,
        link: { to: '/inventory', label: 'Review stock in Inventory' },
      }
    : { id: 'stock-risk', tone: 'positive', text: 'All of your top sellers are well stocked.' }

  return { concentration, stock }
}

function cancellationHighlight({ metrics }) {
  const { value, cancelled } = metrics.orders
  if (cancelled === 0) return { id: 'cancellations', tone: 'positive', text: 'No orders were cancelled in this period.' }
  const rate = ((cancelled / value) * 100).toFixed(1)
  return { id: 'cancellations', tone: 'neutral', text: `${cancelled} of ${value} ${plural(value, 'order was', 'orders were')} cancelled (${rate}%). Cancelled orders are not counted as revenue.` }
}

/**
 * Short, plain-language takeaways for the selected range, computed from the same report the rest
 * of the page shows: what changed, what leads, and what needs attention. Each item is
 * { id, tone: positive | negative | warning | neutral, text, link? }.
 */
export function getAnalyticsInsights(report) {
  if (report.metrics.orders.value === 0) {
    return [{ id: 'no-orders', tone: 'neutral', text: `There are no orders in the ${report.period.title.toLowerCase()}. Try a longer date range.` }]
  }

  const [leader, mover] = categoryHighlights(report)
  const { concentration, stock } = productHighlights(report)
  return [revenueTrend(report), leader, mover, concentration, cancellationHighlight(report), stock].filter(Boolean)
}

/** Everything the Analytics page shows for one range, computed against a single `now`. */
export function getAnalyticsReport(orders, products, rangeKey, { customers = CUSTOMERS, now = new Date() } = {}) {
  const metrics = getAnalyticsMetrics(orders, customers, rangeKey, now)

  const report = {
    period: metrics.period,
    metrics,
    series: buildAnalyticsSeries(orders, customers, rangeKey, now),
    topProducts: getTopProductsInRange(orders, products, rangeKey, 5, now),
    categories: getCategoryPerformance(orders, products, rangeKey, now),
  }
  return { ...report, insights: getAnalyticsInsights(report) }
}
