import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App.jsx'
import { OrdersProvider } from '../../context/OrdersContext.jsx'
import { ProductsProvider } from '../../context/ProductsContext.jsx'
import { useProducts } from '../../context/useProducts.js'
import { CUSTOMERS } from '../../data/customers.js'
import { ORDERS } from '../../data/orders.js'
import { PRODUCTS } from '../../data/products.js'
import { getAnalyticsReport } from '../../data/analyticsSelectors.js'
import { formatCompactNumber, formatCurrency } from '../../utils/format.js'
import Analytics from './Analytics.jsx'

// Freeze the clock so the page and the expectations use exactly the same "now".
const NOW = new Date()
const RANGES = [
  { key: '7d', label: '7D', unit: 'day' },
  { key: '30d', label: '30D', unit: 'day' },
  { key: '90d', label: '90D', unit: 'week' },
  { key: '12m', label: '12M', unit: 'month' },
]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

const expected = (range, orders = ORDERS, products = PRODUCTS) =>
  getAnalyticsReport(orders, products, range, { customers: CUSTOMERS, now: NOW })

function renderAnalytics(children = null) {
  return render(
    <MemoryRouter initialEntries={['/analytics']}>
      <ProductsProvider>
        <OrdersProvider>
          {children}
          <Analytics />
        </OrdersProvider>
      </ProductsProvider>
    </MemoryRouter>,
  )
}

const rangeButton = (label) => screen.getByRole('button', { name: label })
const pickRange = (label) => fireEvent.click(rangeButton(label))
const card = (label) =>
  Array.from(document.querySelectorAll('.metric-card')).find((el) => el.querySelector('.metric-card__label').textContent === label)
const cardValue = (label) => card(label).querySelector('.metric-card__value').textContent
const cardChange = (label) => card(label).querySelector('.metric-card__change').textContent
const section = (title) => screen.getByRole('heading', { name: title, level: 2 }).closest('section')
const trend = (pct) => `${Math.abs(pct).toFixed(1)}% vs prior period`

function expectMetrics(range) {
  const { metrics } = expected(range)
  expect(cardValue('Revenue')).toBe(formatCurrency(metrics.revenue.value))
  expect(cardValue('Orders')).toBe(formatCompactNumber(metrics.orders.value))
  expect(cardValue('Average Order Value')).toBe(formatCurrency(metrics.averageOrderValue.value, { decimals: 2 }))
  expect(cardValue('Units Sold')).toBe(formatCompactNumber(metrics.unitsSold.value))
  expect(cardValue('Customer Growth')).toBe(`+${formatCompactNumber(metrics.customers.newCustomers)}`)
}

describe('Analytics page', () => {
  it('shows the header, the five metrics and every section', () => {
    renderAnalytics()
    expect(screen.getByRole('heading', { name: 'Analytics', level: 1 })).toBeInTheDocument()
    ;['Revenue', 'Orders', 'Average Order Value', 'Units Sold', 'Customer Growth'].forEach((label) =>
      expect(card(label), label).toBeTruthy(),
    )
    ;['Highlights', 'Revenue over time', 'Orders over time', 'Customer growth', 'Top products', 'Category performance'].forEach((title) =>
      expect(section(title), title).toBeInTheDocument(),
    )
  })

  it('starts on 30D with the four ranges available', () => {
    renderAnalytics()
    const group = screen.getByRole('group', { name: 'Date range' })
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual(['7D', '30D', '90D', '12M'])
    expect(rangeButton('30D')).toHaveAttribute('aria-pressed', 'true')
    expect(rangeButton('7D')).toHaveAttribute('aria-pressed', 'false')
    expectMetrics('30d')
    expect(screen.getByText(`Performance for the last 30 days (${expected('30d').period.periodLabel})`)).toBeInTheDocument()
  })

  it.each(RANGES)('$label: every metric, the period and the chart cadence follow the range', ({ key, label, unit }) => {
    renderAnalytics()
    pickRange(label)

    expect(rangeButton(label)).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelectorAll('.date-range__option--active')).toHaveLength(1)
    expectMetrics(key)

    const { period } = expected(key)
    expect(screen.getByText(`Performance for the ${period.title.toLowerCase()} (${period.periodLabel})`)).toBeInTheDocument()
    expect(within(section('Revenue over time')).getByText(`Revenue by ${unit}, cancelled orders excluded`)).toBeInTheDocument()
    expect(within(section('Orders over time')).getByText(new RegExp(`Orders placed by ${unit}`))).toBeInTheDocument()
  })

  it('walking through the ranges really does change the numbers', () => {
    renderAnalytics()
    const revenues = RANGES.map(({ label }) => {
      pickRange(label)
      return cardValue('Revenue')
    })
    expect(new Set(revenues).size).toBe(4)
    pickRange('30D')
    expect(cardValue('Revenue')).toBe(revenues[1]) // and returning restores the earlier view
  })

  it('shows the change against the previous period, and says so when there is nothing to compare', () => {
    renderAnalytics()
    pickRange('7D')
    const week = expected('7d').metrics
    expect(week.revenue.changePct).not.toBeNull()
    expect(cardChange('Revenue')).toBe(trend(week.revenue.changePct))
    expect(cardChange('Orders')).toBe(trend(week.orders.changePct))

    pickRange('12M') // the previous 12 months are before the data begins
    ;['Revenue', 'Orders', 'Average Order Value', 'Units Sold', 'Customer Growth'].forEach((label) =>
      expect(cardChange(label), label).toBe('No prior-period data'),
    )
  })

  it('counts cancelled orders as orders but not as revenue, average order value or units', () => {
    renderAnalytics()
    pickRange('90D')

    const start = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000)
    const inWindow = ORDERS.filter((order) => new Date(order.placedAt) > start && new Date(order.placedAt) <= NOW)
    const paid = inWindow.filter((order) => order.status !== 'Cancelled')
    const cancelled = inWindow.length - paid.length
    expect(cancelled).toBeGreaterThan(0) // the seed really does include cancelled orders in this range

    const revenue = paid.reduce((sum, order) => sum + order.total, 0)
    const units = paid.reduce((sum, order) => sum + order.items.reduce((n, item) => n + item.quantity, 0), 0)
    expect(cardValue('Revenue')).toBe(formatCurrency(revenue))
    expect(cardValue('Orders')).toBe(formatCompactNumber(inWindow.length)) // includes the cancelled ones
    expect(cardValue('Average Order Value')).toBe(formatCurrency(revenue / paid.length, { decimals: 2 }))
    expect(cardValue('Units Sold')).toBe(formatCompactNumber(units))
    expect(screen.getByText(new RegExp(`including ${cancelled} cancelled in this period`))).toBeInTheDocument()
  })

  it('agrees with what the Overview page says for the same range', () => {
    renderAnalytics()
    pickRange('7D')
    const overview = expected('7d').metrics // asserted equal to computeOverviewMetrics in the selector tests
    expect(cardValue('Revenue')).toBe(formatCurrency(overview.revenue.value))
  })

  it.each(RANGES)('$label: top products and category performance follow the range', ({ key, label }) => {
    renderAnalytics()
    pickRange(label)
    const { topProducts, categories } = expected(key)

    const links = within(section('Top products'))
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-label').startsWith('View '))
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual(
      topProducts.map((entry) => `View ${entry.product.name} in Products`),
    )
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      topProducts.map((entry) => `/products?product=${entry.product.id}`),
    )

    const names = Array.from(section('Category performance').querySelectorAll('.category-performance__name'))
    expect(names.map((name) => name.textContent)).toEqual(categories.map((row) => row.category))
    const revenues = Array.from(section('Category performance').querySelectorAll('.category-performance__revenue'))
    expect(revenues.map((el) => el.textContent)).toEqual(categories.map((row) => formatCurrency(row.revenue)))
  })

  it('a shorter range shows sales that belong to that range only', () => {
    renderAnalytics()
    pickRange('12M')
    const yearRevenue = within(section('Top products')).getAllByText(/^\$/).map((el) => el.textContent)
    pickRange('7D')
    const weekRevenue = within(section('Top products')).getAllByText(/^\$/).map((el) => el.textContent)
    expect(weekRevenue).not.toEqual(yearRevenue)
  })

  it('labels each chart with a text summary for assistive technology', () => {
    renderAnalytics()
    pickRange('90D')
    const { metrics } = expected('90d')
    expect(screen.getByRole('img', { name: `Revenue by week: ${formatCurrency(metrics.revenue.value)} in total` })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: `Orders by week: ${metrics.orders.value} placed, ${metrics.orders.cancelled} cancelled` }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: `Customers by week: ${metrics.customers.total} in total, ${metrics.customers.newCustomers} new`,
      }),
    ).toBeInTheDocument()
  })
})

describe('Analytics reads the same shared state as the rest of Nexa', () => {
  function Controls() {
    const { products, deleteProduct, updateProduct } = useProducts()
    const top = expected('30d').topProducts[0].product
    const current = products.find((product) => product.id === top.id)
    return (
      <>
        <button type="button" onClick={() => deleteProduct(top.id)}>
          delete top product
        </button>
        <button
          type="button"
          onClick={() =>
            current &&
            updateProduct(top.id, {
              name: 'Renamed Best Seller',
              sku: current.sku,
              category: current.category,
              price: String(current.price),
              cost: String(current.cost),
              stock: String(current.stock),
              lowStockThreshold: String(current.lowStockThreshold),
              status: current.status,
            })
          }
        >
          rename top product
        </button>
      </>
    )
  }

  it('shows a product renamed elsewhere under its new name, with its sales unchanged', () => {
    renderAnalytics(<Controls />)
    const before = expected('30d').topProducts[0]
    fireEvent.click(screen.getByRole('button', { name: 'rename top product' }))

    const first = within(section('Top products')).getAllByRole('link')[0]
    expect(first).toHaveAttribute('aria-label', 'View Renamed Best Seller in Products')
    expect(within(first.closest('li')).getByText(formatCurrency(before.revenue))).toBeInTheDocument()
  })

  it('drops a deleted product from Top products but keeps its sales in the category totals', () => {
    renderAnalytics(<Controls />)
    const { topProducts, metrics } = expected('30d')
    const removed = topProducts[0]
    fireEvent.click(screen.getByRole('button', { name: 'delete top product' }))

    const names = within(section('Top products')).getAllByRole('link').map((link) => link.getAttribute('aria-label'))
    expect(names.some((name) => name.includes(removed.product.name))).toBe(false)
    expect(names).not.toContain(`View ${removed.product.name} in Products`)

    const rows = Array.from(section('Category performance').querySelectorAll('.category-performance__item'))
    const removedRow = rows.find((row) => row.textContent.includes('Removed products'))
    expect(removedRow).toBeTruthy()
    expect(removedRow.textContent).toContain(formatCurrency(removed.revenue))
    expect(cardValue('Revenue')).toBe(formatCurrency(metrics.revenue.value)) // headline revenue is unaffected
  })

  it('reflects an order cancelled on the Orders page: revenue falls, cancelled orders still count as orders', () => {
    const target = ORDERS.find(
      (order) => (order.status === 'Pending' || order.status === 'Processing') && new Date(order.placedAt) <= NOW,
    )
    expect(target).toBeDefined()
    const before = expected('30d').metrics
    const afterOrders = ORDERS.map((order) => (order.id === target.id ? { ...order, status: 'Cancelled' } : order))
    const after = expected('30d', afterOrders).metrics

    render(
      <MemoryRouter initialEntries={[`/orders?order=${target.id}`]}>
        <App />
      </MemoryRouter>,
    )
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel order' }))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    fireEvent.click(screen.getByRole('link', { name: 'Analytics' }))

    expect(after.revenue.value).toBeCloseTo(before.revenue.value - target.total, 2)
    expect(cardValue('Revenue')).toBe(formatCurrency(after.revenue.value))
    expect(cardValue('Orders')).toBe(formatCompactNumber(before.orders.value)) // still an order that was placed
    expect(after.orders.cancelled).toBe(before.orders.cancelled + 1)
    expect(screen.getByText(new RegExp(`including ${after.orders.cancelled} cancelled in this period`))).toBeInTheDocument()
    expect(cardValue('Units Sold')).toBe(formatCompactNumber(after.unitsSold.value))
    const highlights = section('Highlights')
    const cancellations = expected('30d', afterOrders).insights.find((entry) => entry.id === 'cancellations')
    expect(within(highlights).getByText(cancellations.text)).toBeInTheDocument()
  })
})

describe('Analytics as a reporting and decision-making layer', () => {
  const AT_RISK = ['Low stock', 'Out of stock']
  const topRows = () => Array.from(section('Top products').querySelectorAll('.product-performance__item'))
  const rowFor = (name) => topRows().find((row) => row.querySelector('.product-performance__name').textContent === name)

  it('shows plain-language highlights for the range, and they change with it', () => {
    renderAnalytics()
    expected('30d').insights.forEach((insight) => expect(within(section('Highlights')).getByText(insight.text)).toBeInTheDocument())

    pickRange('12M')
    const year = expected('12m').insights
    year.forEach((insight) => expect(within(section('Highlights')).getByText(insight.text)).toBeInTheDocument())
    expect(within(section('Highlights')).getByText(/no earlier period on record/)).toBeInTheDocument()
    expect(within(section('Highlights')).queryByText(/Revenue is up|Revenue is down/)).not.toBeInTheDocument()
  })

  it('compares revenue with the previous period next to the chart, and drops the comparison when there is none', () => {
    renderAnalytics()
    const { metrics, period } = expected('30d')
    expect(within(section('Revenue over time')).getByText(`Previous 30 days: ${formatCurrency(metrics.revenue.previous)}`)).toBeInTheDocument()
    expect(period.previousTitle).toBe('previous 30 days')

    pickRange('12M')
    expect(within(section('Revenue over time')).queryByText(/^Previous/)).not.toBeInTheDocument()
  })

  it('compares each category with the previous period', () => {
    renderAnalytics()
    const { categories } = expected('30d')
    const rows = Array.from(section('Category performance').querySelectorAll('.category-performance__item'))
    const compared = categories.filter((row) => row.changePct !== null)
    expect(compared.length).toBeGreaterThan(0)

    compared.forEach((row) => {
      const el = rows.find((item) => item.querySelector('.category-performance__name').textContent === row.category)
      const sign = row.changePct >= 0 ? '+' : '−'
      expect(el.querySelector('.category-performance__change').textContent).toBe(`${sign}${Math.abs(row.changePct).toFixed(1)}% vs previous period`)
    })

    pickRange('12M') // nothing to compare against
    expect(section('Category performance').querySelector('.category-performance__change')).toBeNull()
  })

  it('shows every top seller with its share of revenue and its current stock status', () => {
    renderAnalytics()
    const { topProducts } = expected('30d')
    expect(topRows()).toHaveLength(topProducts.length)

    topProducts.forEach((entry) => {
      const row = rowFor(entry.product.name)
      expect(within(row).getByText(entry.stockStatus)).toBeInTheDocument()
      expect(within(row).getByText(`${entry.stock} on hand`)).toBeInTheDocument()
      expect(within(row).getByText(new RegExp(`^${(entry.revenueShare * 100).toFixed(1)}% of revenue`))).toBeInTheDocument()
    })
  })

  it('offers "Manage stock" only for top sellers that are low or out of stock', () => {
    renderAnalytics()
    const { topProducts } = expected('30d')
    const atRisk = topProducts.filter((entry) => AT_RISK.includes(entry.stockStatus))
    expect(atRisk.length).toBeGreaterThan(0) // the seed has best sellers that are running low

    topProducts.forEach((entry) => {
      const link = within(rowFor(entry.product.name)).queryByRole('link', { name: `Manage stock for ${entry.product.name} in Inventory` })
      if (AT_RISK.includes(entry.stockStatus)) expect(link).toHaveAttribute('href', `/inventory?product=${entry.product.id}`)
      else expect(link).toBeNull()
    })
    expect(within(section('Highlights')).getByRole('link', { name: 'Review stock in Inventory' })).toHaveAttribute('href', '/inventory')
  })

  it('goes straight from a low-stock best seller to that product in Inventory', () => {
    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <App />
      </MemoryRouter>,
    )
    const risky = expected('30d').topProducts.find((entry) => AT_RISK.includes(entry.stockStatus))
    fireEvent.click(screen.getByRole('link', { name: `Manage stock for ${risky.product.name} in Inventory` }))

    expect(document.querySelector('.page-header__title').textContent).toBe('Inventory')
    expect(screen.getByRole('dialog', { name: risky.product.name })).toBeInTheDocument()
  })

  describe('reacts to stock changes made elsewhere', () => {
    function StockControls() {
      const { products, restockProduct, adjustProductStock } = useProducts()
      const target = expected('30d').topProducts.find((entry) => AT_RISK.includes(entry.stockStatus)).product
      const current = products.find((product) => product.id === target.id)
      return (
        <>
          <button type="button" onClick={() => restockProduct(target.id, { quantity: '900' })}>
            restock {current.name}
          </button>
          <button type="button" onClick={() => adjustProductStock(target.id, { newQuantity: '0', reason: 'Damaged or lost' })}>
            empty {current.name}
          </button>
        </>
      )
    }
    const target = () => expected('30d').topProducts.find((entry) => AT_RISK.includes(entry.stockStatus)).product

    it('a restock clears the warning for that product', () => {
      renderAnalytics(<StockControls />)
      const { name } = target()
      expect(within(rowFor(name)).getByText(/Low stock|Out of stock/)).toBeInTheDocument()
      expect(within(section('Highlights')).getByText(new RegExp(`restocking:.*${name}`))).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: `restock ${name}` }))
      expect(within(rowFor(name)).getByText('In stock')).toBeInTheDocument()
      expect(within(rowFor(name)).queryByRole('link', { name: /Manage stock/ })).toBeNull()
      expect(within(section('Highlights')).queryByText(new RegExp(`restocking:.*${name}`))).not.toBeInTheDocument()
    })

    it('selling out shows as out of stock in the row and the highlight', () => {
      renderAnalytics(<StockControls />)
      const { name } = target()
      fireEvent.click(screen.getByRole('button', { name: `empty ${name}` }))

      expect(within(rowFor(name)).getByText('Out of stock')).toBeInTheDocument()
      expect(within(rowFor(name)).getByText('0 on hand')).toBeInTheDocument()
      expect(within(section('Highlights')).getByText((text) => text.includes(`${name} (out of stock)`))).toBeInTheDocument()
    })
  })
})
