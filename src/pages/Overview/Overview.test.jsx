import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductsProvider } from '../../context/ProductsContext.jsx'
import { daysAgo } from '../../utils/date.js'
import Overview from './Overview.jsx'

// The page reads its orders from a mutable holder, so each test decides which orders the business has.
const shared = vi.hoisted(() => ({ orders: [] }))
vi.mock('../../context/useOrders.js', () => ({
  useOrders: () => ({ orders: shared.orders, updateOrderStatus: () => {} }),
}))

// A controlled business where every range has a different best seller (see topProductsRange.test.js).
const NOW = new Date(2026, 5, 15, 12, 0)

const product = (id, name) => ({ id, name, category: 'Bags', price: 1, cost: 1, stock: 10, lowStockThreshold: 5, status: 'active' })
const CATALOG = [
  product('old', 'Vintage Trunk'),
  product('yr', 'Yearly Duffel'),
  product('qtr', 'Quarterly Pack'),
  product('mo', 'Monthly Tote'),
  product('wk', 'Weekly Wallet'),
]

function order(id, placedAt, status, productId, quantity, unitPrice) {
  const name = CATALOG.find((p) => p.id === productId).name
  const items = [{ productId, productName: name, quantity, unitPrice }]
  return { id, customerId: 'c001', status, placedAt: placedAt.toISOString(), total: quantity * unitPrice, items }
}

const ORDERS = [
  order('NX-1', daysAgo(400, NOW), 'Delivered', 'old', 10, 100), // $1,000, all-time leader, outside every range
  order('NX-2', daysAgo(200, NOW), 'Delivered', 'yr', 4, 150), //  $600
  order('NX-3', daysAgo(60, NOW), 'Delivered', 'qtr', 3, 100), //  $300
  order('NX-5', daysAgo(20, NOW), 'Shipped', 'mo', 2, 60), //      $120
  order('NX-6', daysAgo(3, NOW), 'Processing', 'wk', 1, 50), //    $50
]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function renderOverview() {
  return render(
    <MemoryRouter>
      <ProductsProvider initialProducts={CATALOG} initialMovements={[]}>
        <Overview />
      </ProductsProvider>
    </MemoryRouter>,
  )
}

const topProducts = () => within(screen.getByRole('heading', { name: 'Top Products' }).closest('section'))
const listedNames = () => Array.from(document.querySelectorAll('.top-products__name')).map((el) => el.textContent)
const chooseRange = (label) => fireEvent.click(screen.getByRole('button', { name: label }))

describe('Overview Top Products follows the selected range', () => {
  beforeEach(() => {
    shared.orders = ORDERS
  })

  it('starts on the default 30D range, not on all-time results', () => {
    renderOverview()
    expect(screen.getByRole('button', { name: '30D' })).toHaveAttribute('aria-pressed', 'true')
    expect(listedNames()).toEqual(['Monthly Tote', 'Weekly Wallet'])
    expect(listedNames()).not.toContain('Vintage Trunk')
  })

  it.each([
    ['7D', ['Weekly Wallet']],
    ['30D', ['Monthly Tote', 'Weekly Wallet']],
    ['90D', ['Quarterly Pack', 'Monthly Tote', 'Weekly Wallet']],
    ['12M', ['Yearly Duffel', 'Quarterly Pack', 'Monthly Tote', 'Weekly Wallet']],
  ])('%s lists only the products sold in that window, best first', (label, expected) => {
    renderOverview()
    chooseRange(label)
    expect(listedNames()).toEqual(expected)
    // The all-time leader sold 400 days ago, so no range may show it.
    expect(topProducts().queryByText('Vintage Trunk')).not.toBeInTheDocument()
  })

  it('changes the list when the range changes, and back again', () => {
    renderOverview()
    chooseRange('7D')
    expect(listedNames()).toEqual(['Weekly Wallet'])
    chooseRange('12M')
    expect(listedNames()).toHaveLength(4)
    chooseRange('7D')
    expect(listedNames()).toEqual(['Weekly Wallet'])
  })

  it('shows revenue, units and product links as before, for the selected window', () => {
    renderOverview()
    chooseRange('90D')
    const leader = topProducts().getByRole('link', { name: 'View Quarterly Pack in Products' })
    expect(leader).toHaveAttribute('href', '/products?product=qtr')
    expect(within(leader).getByText('$300')).toBeInTheDocument()
    expect(within(leader).getByText('3 units sold')).toBeInTheDocument()
    expect(within(leader).getByText('1')).toBeInTheDocument() // rank
  })

  it('agrees with the Total Revenue card of the same range', () => {
    renderOverview()
    const revenueCard = () =>
      Array.from(document.querySelectorAll('.metric-card'))
        .find((el) => el.querySelector('.metric-card__label').textContent === 'Total Revenue')
        .querySelector('.metric-card__value').textContent
    const listedRevenue = () =>
      Array.from(document.querySelectorAll('.top-products__revenue'))
        .map((el) => Number(el.textContent.replace(/[$,]/g, '')))
        .reduce((sum, value) => sum + value, 0)

    ;[['7D', '$50'], ['30D', '$170'], ['90D', '$470'], ['12M', '$1,070']].forEach(([label, revenue]) => {
      chooseRange(label)
      expect(revenueCard()).toBe(revenue)
      expect(`$${listedRevenue().toLocaleString('en-US')}`).toBe(revenue)
    })
  })

  it('says the panel is for the selected period', () => {
    renderOverview()
    expect(screen.getByText('Best performers by revenue for the selected period')).toBeInTheDocument()
  })
})

describe('Overview Recent Orders on the page', () => {
  beforeEach(() => {
    shared.orders = ORDERS
  })

  it('offers every recent order as a table row and as a mobile card carrying the same fields', () => {
    renderOverview()
    const panel = within(screen.getByRole('heading', { name: 'Recent Orders' }).closest('section'))
    const cards = document.querySelectorAll('.recent-orders__cards > li')

    expect(panel.getByRole('table')).toBeInTheDocument()
    expect(cards).toHaveLength(ORDERS.length)

    const newest = cards[0]
    expect(within(newest).getByText('NX-6')).toBeInTheDocument()
    expect(within(newest).getByText('$50.00')).toBeInTheDocument()
    expect(within(newest).getByText('Processing')).toHaveClass('status-badge')
    expect(newest.querySelector('a')).toHaveAttribute('href', '/orders')
  })

  it('keeps the empty state', () => {
    shared.orders = []
    renderOverview()
    expect(screen.getByText('No orders yet.')).toBeInTheDocument()
    expect(document.querySelector('.recent-orders__cards')).toBeNull()
  })
})

describe('Overview Top Products with nothing sold in the range', () => {
  it('keeps the empty state when the only sales are outside the selected window', () => {
    shared.orders = [ORDERS[0]]
    renderOverview()
    ;['7D', '30D', '90D', '12M'].forEach((label) => {
      chooseRange(label)
      expect(topProducts().getByText('No product sales yet.')).toBeInTheDocument()
      expect(listedNames()).toEqual([])
    })
  })

  it('keeps the empty state with no orders at all', () => {
    shared.orders = []
    renderOverview()
    expect(topProducts().getByText('No product sales yet.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/)
  })
})
