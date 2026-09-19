import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductsProvider } from '../../context/ProductsContext.jsx'
import Analytics from './Analytics.jsx'

// A business with no orders at all.
const NO_ORDERS = []
vi.mock('../../context/useOrders.js', () => ({
  useOrders: () => ({ orders: NO_ORDERS, updateOrderStatus: () => {} }),
}))

const cardValue = (label) =>
  Array.from(document.querySelectorAll('.metric-card'))
    .find((el) => el.querySelector('.metric-card__label').textContent === label)
    .querySelector('.metric-card__value').textContent

function renderAnalytics() {
  return render(
    <MemoryRouter>
      <ProductsProvider>
        <Analytics />
      </ProductsProvider>
    </MemoryRouter>,
  )
}

describe('Analytics with no orders', () => {
  it('shows zeros, not NaN, for every order-based metric', () => {
    renderAnalytics()
    expect(cardValue('Revenue')).toBe('$0')
    expect(cardValue('Orders')).toBe('0')
    expect(cardValue('Average Order Value')).toBe('$0.00')
    expect(cardValue('Units Sold')).toBe('0')
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/)
  })

  it('explains the empty revenue and orders charts instead of drawing them', () => {
    renderAnalytics()
    expect(screen.getAllByText('No orders in this period')).toHaveLength(2)
    expect(screen.getAllByText('Try a longer date range.')).toHaveLength(2)
  })

  it('says so in the highlights instead of showing empty statistics', () => {
    renderAnalytics()
    expect(screen.getByText('There are no orders in the last 30 days. Try a longer date range.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '12M' }))
    expect(screen.getByText('There are no orders in the last 12 months. Try a longer date range.')).toBeInTheDocument()
  })

  it('has honest empty states for products and categories', () => {
    renderAnalytics()
    expect(screen.getByText('No product sales in this period.')).toBeInTheDocument()
    expect(screen.getByText('No sales in this period.')).toBeInTheDocument()
  })

  it('still shows customer growth, which does not depend on orders, and works on every range', () => {
    renderAnalytics()
    expect(screen.getByRole('img', { name: /^Customers by day: \d+ in total/ })).toBeInTheDocument()
    ;['7D', '90D', '12M'].forEach((label) => {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
      expect(cardValue('Revenue')).toBe('$0')
    })
  })
})
