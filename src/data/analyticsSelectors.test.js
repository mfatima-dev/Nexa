import { describe, expect, it } from 'vitest'
import { CUSTOMERS } from './customers.js'
import { ORDERS } from './orders.js'
import { PRODUCTS } from './products.js'
import {
  REMOVED_PRODUCTS_LABEL,
  buildAnalyticsSeries,
  getAnalyticsInsights,
  getAnalyticsMetrics,
  getAnalyticsReport,
  getAnalyticsWindow,
  getCategoryPerformance,
  getTopProductsInRange,
} from './analyticsSelectors.js'
import { computeOverviewMetrics } from './selectors.js'

// Saturday 19 Sep 2026, 15:00 local. Every date below is built from local parts, so the tests
// behave the same in any timezone.
const NOW = new Date(2026, 8, 19, 15, 0, 0)
const at = (daysBack, hour = 9) => new Date(2026, 8, 19 - daysBack, hour, 0, 0).toISOString()
const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0)

const product = (id, name, category, price) => ({ id, name, category, price, cost: 1, stock: 10, lowStockThreshold: 2, sku: id, status: 'active' })
const CATALOG = [
  product('p1', 'Urban Backpack', 'Bags', 50),
  product('p2', 'Travel Organizer', 'Travel', 80),
  product('p3', 'Cable Pouch', 'Accessories', 10),
]

const line = (productId, quantity, unitPrice) => ({ productId, productName: productId, quantity, unitPrice })
const order = (id, placedAt, status, items) => ({
  id,
  customerId: 'c001',
  placedAt,
  status,
  items,
  total: sum(items, (item) => item.quantity * item.unitPrice),
})

// Sat 19 Sep is "today". 7D window = (Sat 12 Sep 15:00, now]; 30D = (Wed 20 Aug 15:00, now].
const ORDERS_FIXTURE = [
  order('o1', at(0, 10), 'Delivered', [line('p1', 2, 50)]), //                   100  today
  order('o2', at(0, 12), 'Cancelled', [line('p2', 1, 80)]), //                    80  today, cancelled
  order('o3', at(3), 'Shipped', [line('p1', 1, 50), line('p3', 3, 10)]), //       80  Wed 16 Sep
  order('o4', at(8), 'Delivered', [line('p2', 2, 80)]), //                       160  Fri 11 Sep (previous 7D)
  order('o5', at(20), 'Delivered', [line('p1', 1, 50)]), //                       50  Sun 30 Aug
  order('o6', at(40), 'Delivered', [line('p3', 5, 10)]), //                       50  Mon 10 Aug (previous 30D)
  order('o7', at(45), 'Cancelled', [line('p1', 1, 50)]), //                       50  Wed 5 Aug, cancelled
  order('o8', at(100), 'Delivered', [line('p2', 1, 80)]), //                      80  Thu 11 Jun (previous 90D)
]

const customer = (id, joinedDaysAgo) => ({ id, name: id, joinedAt: at(joinedDaysAgo) })
const CUSTOMERS_FIXTURE = [customer('c1', 200), customer('c2', 20), customer('c3', 3), customer('c4', 50)]

describe('getAnalyticsWindow', () => {
  it('matches the Overview window: N days back from now, with an equally long previous window', () => {
    const w = getAnalyticsWindow('30d', NOW)
    expect(w.end).toEqual(NOW)
    expect(w.start).toEqual(new Date(2026, 7, 20, 15))
    expect(w.previousStart).toEqual(new Date(2026, 6, 21, 15))
    expect(w.previousEnd).toEqual(w.start)
    expect(w.title).toBe('Last 30 days')
    expect(w.periodLabel).toBe('Aug 20 – Sep 19, 2026')
  })

  it('shows the year on both ends when the range crosses a year boundary', () => {
    expect(getAnalyticsWindow('12m', NOW).periodLabel).toBe('Sep 19, 2025 – Sep 19, 2026')
    expect(getAnalyticsWindow('90d', new Date(2026, 1, 10, 9)).periodLabel).toBe('Nov 12, 2025 – Feb 10, 2026')
    expect(getAnalyticsWindow('90d', NOW).periodLabel).toBe('Jun 21 – Sep 19, 2026') // same year: not repeated
  })

  it('knows all four ranges and falls back to 30D for an unknown key', () => {
    expect(['7d', '30d', '90d', '12m'].map((key) => getAnalyticsWindow(key, NOW).days)).toEqual([7, 30, 90, 365])
    expect(getAnalyticsWindow('bogus', NOW).rangeKey).toBe('30d')
  })
})

describe('getAnalyticsMetrics', () => {
  const metrics = (range) => getAnalyticsMetrics(ORDERS_FIXTURE, CUSTOMERS_FIXTURE, range, NOW)

  it('7D: cancelled orders are excluded from revenue, average order value and units, but counted as orders', () => {
    const m = metrics('7d')
    expect(m.revenue.value).toBe(180) // o1 100 + o3 80; o2 (cancelled) is out
    expect(m.orders).toMatchObject({ value: 3, cancelled: 1 })
    expect(m.averageOrderValue.value).toBe(90) // 180 / 2 paid orders, not / 3
    expect(m.unitsSold.value).toBe(6) // 2 + 1 + 3
  })

  it('7D: compares against the previous 7 days', () => {
    const m = metrics('7d') // previous window has only o4: 160 revenue, 1 order, 2 units
    expect(m.revenue.changePct).toBeCloseTo(12.5)
    expect(m.orders.changePct).toBeCloseTo(200)
    expect(m.averageOrderValue.changePct).toBeCloseTo(-43.75)
    expect(m.unitsSold.changePct).toBeCloseTo(200)
  })

  it('30D: a wider range picks up more orders and its own previous period', () => {
    const m = metrics('30d')
    expect(m.revenue.value).toBe(390) // 100 + 80 + 160 + 50
    expect(m.orders).toMatchObject({ value: 5, cancelled: 1 })
    expect(m.averageOrderValue.value).toBe(97.5)
    expect(m.unitsSold.value).toBe(9)
    // previous 30D: o6 (50) and the cancelled o7
    expect(m.revenue.changePct).toBeCloseTo(680)
    expect(m.orders.changePct).toBeCloseTo(150) // 5 vs 2: the cancelled order counts as an order
    expect(m.averageOrderValue.changePct).toBeCloseTo(95)
    expect(m.unitsSold.changePct).toBeCloseTo(80)
  })

  it('90D and 12M include progressively older orders', () => {
    expect(metrics('90d').revenue.value).toBe(440)
    expect(metrics('90d').orders).toMatchObject({ value: 7, cancelled: 2 })
    expect(metrics('12m').revenue.value).toBe(520)
    expect(metrics('12m').orders).toMatchObject({ value: 8, cancelled: 2 })
  })

  it('includes an order at exactly "now" and excludes one at exactly the window start', () => {
    const boundary = [
      { ...order('now', NOW.toISOString(), 'Delivered', [line('p1', 1, 50)]) },
      { ...order('edge', getAnalyticsWindow('7d', NOW).start.toISOString(), 'Delivered', [line('p1', 1, 50)]) },
    ]
    expect(getAnalyticsMetrics(boundary, [], '7d', NOW).orders.value).toBe(1)
  })

  it('reports no change when the previous period starts before the data does, or is zero', () => {
    const wide = metrics('12m')
    expect(wide.revenue.changePct).toBeNull()
    expect(wide.orders.changePct).toBeNull()
    expect(wide.customers.changePct).toBeNull()

    const onlyRecent = [order('a', at(1), 'Delivered', [line('p1', 1, 50)])]
    expect(getAnalyticsMetrics(onlyRecent, [], '7d', NOW).revenue.changePct).toBeNull()
  })

  it('customer growth counts customers who joined in the window and compares with the previous one', () => {
    expect(metrics('7d').customers).toMatchObject({ newCustomers: 1, total: 4, changePct: null }) // c3; none before
    expect(metrics('30d').customers).toMatchObject({ newCustomers: 2, total: 4 }) // c2, c3
    expect(metrics('30d').customers.changePct).toBeCloseTo(100) // previous 30D: c4
    expect(metrics('12m').customers.newCustomers).toBe(4)
  })

  it('is all zeros, without NaN, when there is nothing to report', () => {
    const empty = getAnalyticsMetrics([], [], '30d', NOW)
    expect(empty.revenue.value).toBe(0)
    expect(empty.orders).toMatchObject({ value: 0, cancelled: 0 })
    expect(empty.averageOrderValue.value).toBe(0)
    expect(empty.unitsSold.value).toBe(0)
    expect(empty.customers).toMatchObject({ newCustomers: 0, total: 0 })
    ;[empty.revenue, empty.orders, empty.averageOrderValue, empty.unitsSold, empty.customers].forEach((entry) =>
      expect(entry.changePct).toBeNull(),
    )
  })

  it('an order set that is entirely cancelled has no revenue and no average', () => {
    const cancelled = [order('x', at(1), 'Cancelled', [line('p1', 2, 50)])]
    const m = getAnalyticsMetrics(cancelled, [], '7d', NOW)
    expect(m.orders).toMatchObject({ value: 1, cancelled: 1 })
    expect(m.revenue.value).toBe(0)
    expect(m.averageOrderValue.value).toBe(0)
    expect(m.unitsSold.value).toBe(0)
  })
})

describe('buildAnalyticsSeries', () => {
  const series = (range) => buildAnalyticsSeries(ORDERS_FIXTURE, CUSTOMERS_FIXTURE, range, NOW)

  it('7D and 30D are daily; the first and last days can be partial', () => {
    const week = series('7d')
    expect(week.map((point) => point.key)).toEqual([
      '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19',
    ])
    expect(week[0].label).toBe('Sep 12')
    expect(week[0].tooltipLabel).toBe('Sat, Sep 12, 2026')
    expect(series('30d')).toHaveLength(31)
  })

  it('puts each order on its own day, splitting cancelled from active', () => {
    const [today, wed] = [series('7d').at(-1), series('7d').find((point) => point.key === '2026-09-16')]
    expect(today).toMatchObject({ revenue: 100, orders: 2, activeOrders: 1, cancelled: 1, unitsSold: 2 })
    expect(wed).toMatchObject({ revenue: 80, orders: 1, activeOrders: 1, cancelled: 0, unitsSold: 4 })
  })

  it('90D is weekly, Monday to Sunday', () => {
    const weeks = series('90d')
    expect(weeks).toHaveLength(14)
    expect(weeks[0].key).toBe('2026-06-15') // the Monday of the week containing 21 Jun
    expect(weeks.at(-1).key).toBe('2026-09-14')
    expect(weeks.at(-1).tooltipLabel).toBe('Week of Sep 14')
    expect(weeks.find((week) => week.key === '2026-08-10')).toMatchObject({ revenue: 50, orders: 1 })
    expect(weeks.find((week) => week.key === '2026-08-03')).toMatchObject({ revenue: 0, orders: 1, cancelled: 1 })
  })

  it('12M is monthly and starts at the first data point, not a year ago', () => {
    const months = series('12m')
    expect(months.map((point) => point.key)).toEqual([
      '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01',
    ])
    expect(months[0].label).toBe('Mar ’26')
    expect(months[0].tooltipLabel).toBe('March 2026')
    expect(months.find((month) => month.key === '2026-06-01').revenue).toBe(80)
  })

  it('every field adds up to the headline metric, for every range', () => {
    ;['7d', '30d', '90d', '12m'].forEach((range) => {
      const points = series(range)
      const m = getAnalyticsMetrics(ORDERS_FIXTURE, CUSTOMERS_FIXTURE, range, NOW)
      expect(sum(points, (p) => p.revenue), `${range} revenue`).toBeCloseTo(m.revenue.value)
      expect(sum(points, (p) => p.orders), `${range} orders`).toBe(m.orders.value)
      expect(sum(points, (p) => p.cancelled), `${range} cancelled`).toBe(m.orders.cancelled)
      expect(sum(points, (p) => p.activeOrders) + sum(points, (p) => p.cancelled)).toBe(m.orders.value)
      expect(sum(points, (p) => p.unitsSold), `${range} units`).toBe(m.unitsSold.value)
      expect(sum(points, (p) => p.newCustomers), `${range} new customers`).toBe(m.customers.newCustomers)
      expect(points.at(-1).totalCustomers, `${range} total customers`).toBe(m.customers.total)
    })
  })

  it('total customers is a running count that only ever grows', () => {
    const totals = series('7d').map((point) => point.totalCustomers)
    expect(totals).toEqual([3, 3, 3, 3, 4, 4, 4, 4]) // c3 joined on the 16th
    ;['30d', '90d', '12m'].forEach((range) => {
      const running = series(range).map((point) => point.totalCustomers)
      expect(running).toEqual([...running].sort((a, b) => a - b))
    })
  })

  it('still returns the window as empty periods when there are no orders or customers', () => {
    const empty = buildAnalyticsSeries([], [], '7d', NOW)
    expect(empty).toHaveLength(8)
    expect(empty.every((point) => point.revenue === 0 && point.orders === 0 && point.totalCustomers === 0)).toBe(true)
  })

  it('is stable when a bucket boundary is crossed with a different "now"', () => {
    const lateNight = new Date(2026, 8, 19, 23, 59, 59)
    const points = buildAnalyticsSeries(ORDERS_FIXTURE, CUSTOMERS_FIXTURE, '7d', lateNight)
    expect(points.at(-1).key).toBe('2026-09-19')
    expect(sum(points, (p) => p.orders)).toBe(getAnalyticsMetrics(ORDERS_FIXTURE, CUSTOMERS_FIXTURE, '7d', lateNight).orders.value)
  })
})

describe('getTopProductsInRange', () => {
  it('ranks by revenue within the range, ignoring cancelled orders', () => {
    const top = getTopProductsInRange(ORDERS_FIXTURE, CATALOG, '30d', 5, NOW)
    expect(top.map((entry) => [entry.product.id, entry.revenue, entry.unitsSold])).toEqual([
      ['p1', 200, 4],
      ['p2', 160, 2], // o2's cancelled organizer is not counted
      ['p3', 30, 3],
    ])
    expect(top.map((entry) => entry.share)).toEqual([1, 0.8, 0.15])
  })

  it('changes with the range: a shorter range only sees its own sales', () => {
    const top = getTopProductsInRange(ORDERS_FIXTURE, CATALOG, '7d', 5, NOW)
    expect(top.map((entry) => entry.product.id)).toEqual(['p1', 'p3'])
    expect(top[0]).toMatchObject({ revenue: 150, unitsSold: 3 })
  })

  it('respects the limit and breaks revenue ties by units, then name', () => {
    // All three earn 60. p2 sold the most units; p1 and p3 tie on units too, so the name decides.
    const tied = [order('t1', at(1), 'Delivered', [line('p1', 1, 60), line('p2', 2, 30), line('p3', 1, 60)])]
    const top = getTopProductsInRange(tied, CATALOG, '7d', 5, NOW)
    expect(top.map((entry) => entry.product.id)).toEqual(['p2', 'p3', 'p1']) // Travel Organizer, Cable Pouch, Urban Backpack
    expect(getTopProductsInRange(tied, CATALOG, '7d', 2, NOW)).toHaveLength(2)
  })

  it('leaves out products that were deleted from the catalog and has no crash on an empty range', () => {
    const withoutP2 = CATALOG.filter((item) => item.id !== 'p2')
    expect(getTopProductsInRange(ORDERS_FIXTURE, withoutP2, '30d', 5, NOW).map((e) => e.product.id)).toEqual(['p1', 'p3'])
    expect(getTopProductsInRange([], CATALOG, '30d', 5, NOW)).toEqual([])
  })
})

describe('getCategoryPerformance', () => {
  it('sums revenue and units per category, with shares of the range total', () => {
    const rows = getCategoryPerformance(ORDERS_FIXTURE, CATALOG, '30d', NOW)
    expect(rows.map((row) => row.category)).toEqual(['Bags', 'Travel', 'Accessories', 'Tech'])
    expect(rows.map((row) => row.revenue)).toEqual([200, 160, 30, 0])
    expect(rows.map((row) => row.unitsSold)).toEqual([4, 2, 3, 0])
    expect(rows[0].share).toBeCloseTo(200 / 390)
    expect(sum(rows, (row) => row.share)).toBeCloseTo(1)
    expect(sum(rows, (row) => row.revenue)).toBe(getAnalyticsMetrics(ORDERS_FIXTURE, [], '30d', NOW).revenue.value)
  })

  it('re-ranks when the range changes', () => {
    const rows = getCategoryPerformance(ORDERS_FIXTURE, CATALOG, '7d', NOW)
    expect(rows.map((row) => [row.category, row.revenue])).toEqual([
      ['Bags', 150],
      ['Accessories', 30],
      ['Tech', 0],
      ['Travel', 0], // the only Travel sale in 7D was cancelled
    ])
  })

  it('keeps the total honest when a product was deleted: its sales move to "Removed products"', () => {
    const withoutP2 = CATALOG.filter((item) => item.id !== 'p2')
    const rows = getCategoryPerformance(ORDERS_FIXTURE, withoutP2, '30d', NOW)
    expect(rows.find((row) => row.category === REMOVED_PRODUCTS_LABEL)).toMatchObject({ revenue: 160, unitsSold: 2 })
    expect(sum(rows, (row) => row.revenue)).toBe(390)
    // ...and the row is not shown at all when nothing was removed
    expect(getCategoryPerformance(ORDERS_FIXTURE, CATALOG, '30d', NOW).some((row) => row.category === REMOVED_PRODUCTS_LABEL)).toBe(false)
  })

  it('has zero shares, not NaN, when there were no sales', () => {
    const rows = getCategoryPerformance([], CATALOG, '30d', NOW)
    expect(rows).toHaveLength(4)
    expect(rows.every((row) => row.revenue === 0 && row.share === 0)).toBe(true)
  })
})

describe('comparison with the previous period', () => {
  it('metrics carry the previous period value, or null when there is nothing comparable', () => {
    const week = getAnalyticsMetrics(ORDERS_FIXTURE, CUSTOMERS_FIXTURE, '7d', NOW)
    expect(week.revenue.previous).toBe(160)
    expect(week.orders.previous).toBe(1)
    expect(week.averageOrderValue.previous).toBe(160)
    expect(week.unitsSold.previous).toBe(2)
    expect(week.customers.previous).toBe(0)

    const year = getAnalyticsMetrics(ORDERS_FIXTURE, CUSTOMERS_FIXTURE, '12m', NOW)
    ;[year.revenue, year.orders, year.averageOrderValue, year.unitsSold, year.customers].forEach((entry) =>
      expect(entry.previous).toBeNull(),
    )
    expect(getAnalyticsWindow('30d', NOW).previousTitle).toBe('previous 30 days')
  })

  it('categories are compared with the same category in the previous period', () => {
    const rows = getCategoryPerformance(ORDERS_FIXTURE, CATALOG, '30d', NOW) // previous 30D: only o6, 50 of Accessories
    const byName = Object.fromEntries(rows.map((row) => [row.category, row]))
    expect(byName.Accessories).toMatchObject({ revenue: 30, previousRevenue: 50 })
    expect(byName.Accessories.changePct).toBeCloseTo(-40)
    expect(byName.Bags).toMatchObject({ previousRevenue: 0, changePct: null }) // nothing to divide by
    expect(sum(rows, (row) => row.previousRevenue)).toBe(getAnalyticsMetrics(ORDERS_FIXTURE, [], '30d', NOW).revenue.previous)
  })

  it('has no category comparison at all when the previous period predates the data', () => {
    getCategoryPerformance(ORDERS_FIXTURE, CATALOG, '12m', NOW).forEach((row) => {
      expect(row.previousRevenue).toBeNull()
      expect(row.changePct).toBeNull()
    })
  })
})

describe('top products: revenue share and stock status', () => {
  const STOCKED = [
    { ...CATALOG[0], stock: 2, lowStockThreshold: 2 }, // at the threshold: low
    { ...CATALOG[1], stock: 0 }, // out
    { ...CATALOG[2], stock: 10 },
  ]

  it("carries each product's share of the range's revenue", () => {
    const top = getTopProductsInRange(ORDERS_FIXTURE, CATALOG, '30d', 5, NOW)
    expect(top.map((entry) => entry.revenueShare)).toEqual([200 / 390, 160 / 390, 30 / 390])
    expect(sum(top, (entry) => entry.revenueShare)).toBeCloseTo(1)
  })

  it('reads the current stock status from the shared products, using the Inventory rules', () => {
    const top = getTopProductsInRange(ORDERS_FIXTURE, STOCKED, '30d', 5, NOW)
    expect(top.map((entry) => [entry.product.id, entry.stock, entry.stockStatus])).toEqual([
      ['p1', 2, 'Low stock'],
      ['p2', 0, 'Out of stock'],
      ['p3', 10, 'In stock'],
    ])
    const discontinued = STOCKED.map((item) => (item.id === 'p1' ? { ...item, status: 'discontinued' } : item))
    expect(getTopProductsInRange(ORDERS_FIXTURE, discontinued, '30d', 5, NOW)[0].stockStatus).toBe('Discontinued')
  })
})

describe('getAnalyticsInsights', () => {
  const STOCKED = [
    { ...CATALOG[0], stock: 2, lowStockThreshold: 2 },
    { ...CATALOG[1], stock: 0 },
    { ...CATALOG[2], stock: 10 },
  ]
  const report = (range, orders = ORDERS_FIXTURE, catalog = STOCKED) =>
    getAnalyticsReport(orders, catalog, range, { customers: CUSTOMERS_FIXTURE, now: NOW })
  const insight = (r, id) => r.insights.find((entry) => entry.id === id)

  it('tells the story of a 30D range: trend, leaders, concentration, cancellations, stock', () => {
    const { insights } = report('30d')
    expect(insights.map((entry) => entry.id)).toEqual([
      'revenue-trend', 'category-leader', 'category-mover', 'concentration', 'cancellations', 'stock-risk',
    ])
    expect(insights[0]).toMatchObject({
      tone: 'positive',
      text: 'Revenue is up 680.0% on the previous 30 days ($50 to $390). The change is driven mainly by order volume: orders are +150.0% and average order value is +95.0%.',
    })
    expect(insights[1].text).toBe('Bags is the top category with $200, 51.3% of revenue.')
    expect(insights[2]).toMatchObject({ tone: 'positive', text: 'Bags moved the most: +$200 against the previous 30 days.' })
    expect(insights[3].text).toBe('Your top 3 products bring in 100.0% of revenue.')
    expect(insights[4].text).toBe('1 of 5 orders were cancelled (20.0%). Cancelled orders are not counted as revenue.')
  })

  it('flags top sellers that are low or out of stock, with a link to Inventory', () => {
    const stock = insight(report('30d'), 'stock-risk')
    expect(stock).toMatchObject({ tone: 'warning', link: { to: '/inventory', label: 'Review stock in Inventory' } })
    expect(stock.text).toBe('2 top-selling products need restocking: Urban Backpack (2 left), Travel Organizer (out of stock).')
  })

  it('says everything is well stocked when it is', () => {
    expect(insight(report('30d', ORDERS_FIXTURE, CATALOG), 'stock-risk')).toMatchObject({
      tone: 'positive',
      text: 'All of your top sellers are well stocked.',
    })
  })

  it('does not raise a stock alert for a discontinued top seller', () => {
    const discontinued = STOCKED.map((item) => ({ ...item, status: 'discontinued' }))
    expect(insight(report('30d', ORDERS_FIXTURE, discontinued), 'stock-risk').tone).toBe('positive')
  })

  it('reports a decline as negative, and names order size when basket value drives it', () => {
    const orders = [
      order('a', at(1), 'Delivered', [line('p1', 2, 50)]), // 100 now
      order('b', at(9), 'Delivered', [line('p2', 1, 200)]), // 200 before
    ]
    const trend = insight(report('7d', orders), 'revenue-trend')
    expect(trend.tone).toBe('negative')
    expect(trend.text).toBe(
      'Revenue is down 50.0% on the previous 7 days ($200 to $100). The change is driven mainly by order size: orders are +0.0% and average order value is −50.0%.',
    )
  })

  it('says flat when revenue did not move, without inventing a driver', () => {
    const orders = [order('a', at(1), 'Delivered', [line('p1', 2, 50)]), order('b', at(9), 'Delivered', [line('p1', 2, 50)])]
    expect(insight(report('7d', orders), 'revenue-trend')).toMatchObject({
      tone: 'neutral',
      text: 'Revenue is flat on the previous 7 days ($100 to $100).',
    })
  })

  it('is honest when there is nothing to compare against', () => {
    expect(insight(report('12m'), 'revenue-trend').text).toBe(
      'Revenue is $520 for the last 12 months. There is no earlier period on record to compare it with.',
    )
    expect(report('12m').insights.some((entry) => entry.id === 'category-mover')).toBe(false)

    const oldOrder = order('old', at(100), 'Delivered', [line('p1', 1, 50)])
    const recent = order('new', at(1), 'Delivered', [line('p1', 2, 50)])
    expect(insight(report('7d', [oldOrder, recent]), 'revenue-trend').text).toBe(
      'Revenue is $100. The previous 7 days had no revenue to compare with.',
    )
  })

  it('reports no cancellations positively, and uses the singular for a single order', () => {
    const one = [order('a', at(1), 'Delivered', [line('p1', 1, 50), line('p2', 1, 80)])]
    expect(insight(report('7d', one), 'cancellations')).toMatchObject({ tone: 'positive', text: 'No orders were cancelled in this period.' })
    const cancelledOne = [order('a', at(1), 'Cancelled', [line('p1', 1, 50)]), order('b', at(2), 'Delivered', [line('p1', 1, 50)])]
    expect(insight(report('7d', cancelledOne), 'cancellations').text).toContain('1 of 2 orders were cancelled (50.0%)')
    const only = [order('a', at(1), 'Cancelled', [line('p1', 1, 50)])]
    expect(insight(report('7d', only), 'cancellations').text).toContain('1 of 1 order was cancelled (100.0%)')
  })

  it('leaves out the concentration highlight with fewer than three products, but keeps the stock one', () => {
    const two = [order('a', at(1), 'Delivered', [line('p1', 1, 50), line('p2', 1, 80)])]
    const ids = report('7d', two).insights.map((entry) => entry.id)
    expect(ids).not.toContain('concentration')
    expect(ids).toContain('stock-risk')
  })

  it('says there are no orders instead of showing empty statistics', () => {
    expect(report('7d', []).insights).toEqual([
      { id: 'no-orders', tone: 'neutral', text: 'There are no orders in the last 7 days. Try a longer date range.' },
    ])
    const onlyOld = [order('old', at(100), 'Delivered', [line('p1', 1, 50)])]
    expect(report('7d', onlyOld).insights.map((entry) => entry.id)).toEqual(['no-orders'])
  })

  it('exposes the same insights through getAnalyticsInsights', () => {
    const r = report('30d')
    expect(getAnalyticsInsights(r)).toEqual(r.insights)
  })
})

describe('the real seeded data', () => {
  const RANGES = ['7d', '30d', '90d', '12m']
  const now = new Date()
  const report = (range) => getAnalyticsReport(ORDERS, PRODUCTS, range, { customers: CUSTOMERS, now })

  it('agrees with the Overview page for revenue and orders in every range', () => {
    RANGES.forEach((range) => {
      const overview = computeOverviewMetrics(ORDERS, range, now)
      const analytics = report(range).metrics
      expect(analytics.revenue.value, `${range} revenue`).toBeCloseTo(overview.revenue.value, 2)
      expect(analytics.orders.value, `${range} orders`).toBe(overview.orders.value)
      expect(analytics.revenue.changePct, `${range} revenue change`).toEqual(overview.revenue.changePct)
      expect(analytics.orders.changePct, `${range} orders change`).toEqual(overview.orders.changePct)
    })
  })

  it('every series, category table and product list reconciles with its headline metrics', () => {
    RANGES.forEach((range) => {
      const { metrics, series, categories, topProducts } = report(range)
      expect(sum(series, (p) => p.revenue), `${range} series revenue`).toBeCloseTo(metrics.revenue.value, 2)
      expect(sum(series, (p) => p.orders), `${range} series orders`).toBe(metrics.orders.value)
      expect(sum(series, (p) => p.unitsSold), `${range} series units`).toBe(metrics.unitsSold.value)
      expect(sum(series, (p) => p.newCustomers), `${range} series customers`).toBe(metrics.customers.newCustomers)
      expect(sum(categories, (c) => c.revenue), `${range} categories`).toBeCloseTo(metrics.revenue.value, 2)
      expect(sum(categories, (c) => c.unitsSold), `${range} category units`).toBe(metrics.unitsSold.value)
      expect(topProducts.length).toBeLessThanOrEqual(5)
      expect(sum(topProducts, (t) => t.revenue)).toBeLessThanOrEqual(metrics.revenue.value + 0.01)
    })
  })

  it('a longer range never reports less than a shorter one', () => {
    const [d7, d30, d90, m12] = RANGES.map((range) => report(range).metrics)
    ;['revenue', 'orders', 'unitsSold'].forEach((field) => {
      expect(d7[field].value).toBeLessThanOrEqual(d30[field].value)
      expect(d30[field].value).toBeLessThanOrEqual(d90[field].value)
      expect(d90[field].value).toBeLessThanOrEqual(m12[field].value)
    })
  })

  it('12M covers the whole seeded history up to now', () => {
    // The seed gives today's orders random hours, so some are stamped later than "now". Like the
    // Overview page, a window ends at now and does not count them yet.
    const happened = ORDERS.filter((o) => new Date(o.placedAt) <= now)
    expect(happened.length).toBeGreaterThan(ORDERS.length - 20)
    expect(report('12m').metrics.revenue.value).toBeCloseTo(sum(happened.filter((o) => o.status !== 'Cancelled'), (o) => o.total), 2)
    expect(report('12m').metrics.orders.value).toBe(happened.length)
    expect(report('12m').metrics.customers.newCustomers).toBe(CUSTOMERS.length)
  })

  it('average order value is revenue over non-cancelled orders', () => {
    RANGES.forEach((range) => {
      const { metrics } = report(range)
      const paid = metrics.orders.value - metrics.orders.cancelled
      expect(metrics.averageOrderValue.value).toBeCloseTo(paid ? metrics.revenue.value / paid : 0, 2)
    })
  })

  it("category previous-period revenue adds up to the previous period's revenue, and shares add up to 1", () => {
    RANGES.forEach((range) => {
      const { metrics, categories, topProducts } = report(range)
      if (metrics.revenue.previous === null) {
        expect(categories.every((row) => row.previousRevenue === null), range).toBe(true)
      } else {
        expect(sum(categories, (row) => row.previousRevenue), `${range} previous`).toBeCloseTo(metrics.revenue.previous, 2)
      }
      expect(sum(categories, (row) => row.share), range).toBeCloseTo(metrics.revenue.value ? 1 : 0)
      topProducts.forEach((entry) => {
        expect(entry.revenueShare).toBeGreaterThan(0)
        expect(entry.revenueShare).toBeLessThanOrEqual(1)
        expect(entry.stockStatus).toBe(
          entry.product.status === 'discontinued' ? 'Discontinued' : entry.stock <= 0 ? 'Out of stock' : entry.stock <= entry.product.lowStockThreshold ? 'Low stock' : 'In stock',
        )
      })
    })
  })

  it('every range produces readable insights with unique ids and no broken numbers', () => {
    RANGES.forEach((range) => {
      const { insights } = report(range)
      expect(insights.length).toBeGreaterThanOrEqual(3)
      expect(new Set(insights.map((entry) => entry.id)).size).toBe(insights.length)
      insights.forEach((entry) => {
        expect(entry.text.length).toBeGreaterThan(10)
        expect(entry.text, `${range} ${entry.id}`).not.toMatch(/NaN|Infinity|undefined|null/)
        expect(['positive', 'negative', 'warning', 'neutral']).toContain(entry.tone)
      })
    })
  })

  it('does not change the shared data it reads', () => {
    const before = JSON.stringify({ ORDERS, PRODUCTS, CUSTOMERS })
    RANGES.forEach((range) => report(range))
    expect(JSON.stringify({ ORDERS, PRODUCTS, CUSTOMERS })).toBe(before)
  })
})
