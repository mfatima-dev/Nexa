import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CustomerDetailsDrawer from './CustomerDetailsDrawer.jsx'

// The drawer shows dates in the viewer's local time, so fixtures are local noon: the calendar date they
// show is the same in every timezone (a fixed UTC noon crosses midnight at UTC+12 and beyond).
const localNoon = (year, month, day) => new Date(year, month - 1, day, 12).toISOString()

const customer = {
  id: 'c001',
  name: 'Sarah Bennett',
  email: 'sarah.bennett@gmail.com',
  city: 'Austin',
  state: 'TX',
  joinedAt: localNoon(2026, 3, 5),
}

function makeOrder(n, status = 'Delivered', total = 100) {
  return { id: `NX-${1000 + n}`, customerId: 'c001', status, total, placedAt: localNoon(2026, 6, 20 - n) }
}

function renderDrawer(entry, orders) {
  return render(
    <MemoryRouter>
      <CustomerDetailsDrawer entry={entry} orders={orders} onClose={vi.fn()} />
    </MemoryRouter>,
  )
}

const entry = {
  customer,
  orderCount: 3,
  totalSpent: 240,
  averageOrderValue: 120,
  lastOrderAt: localNoon(2026, 6, 19),
  status: 'Active',
}

describe('CustomerDetailsDrawer', () => {
  it('renders nothing without a customer', () => {
    const { container } = renderDrawer(null, [])
    expect(container).toBeEmptyDOMElement()
  })

  it('shows profile details and purchase summary', () => {
    renderDrawer(entry, [makeOrder(1), makeOrder(2, 'Cancelled'), makeOrder(3)])
    const dialog = screen.getByRole('dialog', { name: 'Sarah Bennett' })

    expect(within(dialog).getByText('sarah.bennett@gmail.com')).toBeInTheDocument()
    expect(within(dialog).getByText('Austin, TX')).toBeInTheDocument()
    expect(within(dialog).getByText('March 5, 2026')).toBeInTheDocument()
    expect(within(dialog).getByText('Active')).toBeInTheDocument()

    const stat = (label) => within(dialog).getByText(label).closest('div')
    expect(within(stat('Total orders')).getByText('3')).toBeInTheDocument()
    expect(within(stat('Total spent')).getByText('$240.00')).toBeInTheDocument()
    expect(within(stat('Avg. order value')).getByText('$120.00')).toBeInTheDocument()
    expect(within(stat('Last order')).getByText('Jun 19, 2026')).toBeInTheDocument()
  })

  it('lists orders as links into the existing Orders page', () => {
    renderDrawer(entry, [makeOrder(1), makeOrder(2, 'Cancelled', 55)])

    const link = screen.getByRole('link', { name: /NX-1001/ })
    expect(link).toHaveAttribute('href', '/orders?order=NX-1001')
    expect(within(link).getByText('Delivered')).toBeInTheDocument()
    expect(within(link).getByText('$100.00')).toBeInTheDocument()

    const cancelled = screen.getByRole('link', { name: /NX-1002/ })
    expect(within(cancelled).getByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument()
  })

  it('shows only the 5 most recent orders and links to the rest', () => {
    const orders = Array.from({ length: 7 }, (_, i) => makeOrder(i + 1))
    renderDrawer({ ...entry, orderCount: 7 }, orders)

    expect(screen.getAllByRole('link', { name: /NX-10/ })).toHaveLength(5)
    expect(screen.getByRole('link', { name: 'View all 7 orders' })).toHaveAttribute(
      'href',
      '/orders?q=Sarah%20Bennett',
    )
  })

  it('handles a customer with no orders', () => {
    renderDrawer(
      { customer, orderCount: 0, totalSpent: 0, averageOrderValue: 0, lastOrderAt: null, status: 'No orders' },
      [],
    )

    expect(screen.getByText("This customer hasn't placed an order yet.")).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })
})
