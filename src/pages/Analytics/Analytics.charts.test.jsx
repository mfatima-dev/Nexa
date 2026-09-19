import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OrdersProvider } from '../../context/OrdersContext.jsx'
import { ProductsProvider } from '../../context/ProductsContext.jsx'
import { CUSTOMERS } from '../../data/customers.js'
import { ORDERS } from '../../data/orders.js'
import { PRODUCTS } from '../../data/products.js'
import { getAnalyticsReport } from '../../data/analyticsSelectors.js'
import Analytics from './Analytics.jsx'

// Recharts draws nothing at 0px wide, which is what jsdom gives it. These stand-ins record the
// data each chart is handed, so the wiring between the page, the range and the chart is testable.
const received = vi.hoisted(() => ({ revenue: null, orders: null, customers: null }))

vi.mock('../../components/dashboard/RevenueChart.jsx', () => ({
  default: ({ data }) => {
    received.revenue = data
    return <div data-testid="revenue-chart" />
  },
}))
vi.mock('../../components/analytics/OrdersChart.jsx', () => ({
  default: ({ data }) => {
    received.orders = data
    return <div data-testid="orders-chart" />
  },
}))
vi.mock('../../components/analytics/CustomerGrowthChart.jsx', () => ({
  default: ({ data }) => {
    received.customers = data
    return <div data-testid="customer-chart" />
  },
}))

const NOW = new Date()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

// A weekly chart has one point per Monday-start calendar week that the window touches (the first and last
// can be partial), so its length depends on the weekday: 13 when the window starts on a Monday, else 14.
function weeksTouchedByWindow(days) {
  const mondayOf = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7))
  const windowStart = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - days)
  return Math.round((mondayOf(NOW) - mondayOf(windowStart)) / (7 * 24 * 60 * 60 * 1000)) + 1
}

const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0)
const expected = (range) => getAnalyticsReport(ORDERS, PRODUCTS, range, { customers: CUSTOMERS, now: NOW })

function renderAnalytics() {
  return render(
    <MemoryRouter>
      <ProductsProvider>
        <OrdersProvider>
          <Analytics />
        </OrdersProvider>
      </ProductsProvider>
    </MemoryRouter>,
  )
}

describe('the data handed to the charts', () => {
  it('renders all three charts', () => {
    renderAnalytics()
    expect(screen.getByTestId('revenue-chart')).toBeInTheDocument()
    expect(screen.getByTestId('orders-chart')).toBeInTheDocument()
    expect(screen.getByTestId('customer-chart')).toBeInTheDocument()
  })

  it.each([
    ['7D', '7d', 8],
    ['30D', '30d', 31],
    ['90D', '90d', weeksTouchedByWindow(90)],
  ])('%s: the charts get one point per day/week, and their totals equal the headline metrics', (label, key, points) => {
    renderAnalytics()
    fireEvent.click(screen.getByRole('button', { name: label }))
    const { metrics } = expected(key)

    expect(received.revenue).toHaveLength(points)
    expect(received.orders).toHaveLength(points)
    expect(received.customers).toHaveLength(points)

    expect(sum(received.revenue, (point) => point.value)).toBeCloseTo(metrics.revenue.value, 2)
    expect(sum(received.orders, (point) => point.orders)).toBe(metrics.orders.value)
    expect(sum(received.orders, (point) => point.cancelled)).toBe(metrics.orders.cancelled)
    expect(received.customers.at(-1).totalCustomers).toBe(metrics.customers.total)
  })

  it('12M: monthly points, starting where the data starts', () => {
    renderAnalytics()
    fireEvent.click(screen.getByRole('button', { name: '12M' }))
    const { metrics } = expected('12m')

    expect(received.revenue.length).toBeGreaterThanOrEqual(9)
    expect(received.revenue.length).toBeLessThanOrEqual(13)
    expect(received.revenue.every((point) => /^[A-Z][a-z]{2} ’\d{2}$/.test(point.label))).toBe(true)
    expect(sum(received.revenue, (point) => point.value)).toBeCloseTo(metrics.revenue.value, 2)
    expect(sum(received.customers, (point) => point.newCustomers)).toBe(metrics.customers.newCustomers)
  })

  it('switching the range hands the charts a different series', () => {
    renderAnalytics()
    const thirty = received.revenue.map((point) => point.label)
    fireEvent.click(screen.getByRole('button', { name: '7D' }))
    const seven = received.revenue.map((point) => point.label)

    expect(seven).not.toEqual(thirty)
    expect(seven).toHaveLength(8)
    expect(received.orders.map((point) => point.label)).toEqual(seven)
  })

  it('cancelled orders are stacked separately from the active orders that make up revenue', () => {
    renderAnalytics()
    fireEvent.click(screen.getByRole('button', { name: '90D' }))
    expect(received.orders.every((point) => point.activeOrders + point.cancelled === point.orders)).toBe(true)
    expect(sum(received.orders, (point) => point.cancelled)).toBeGreaterThan(0)
  })
})
