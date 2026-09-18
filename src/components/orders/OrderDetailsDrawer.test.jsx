import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import OrderDetailsDrawer from './OrderDetailsDrawer.jsx'

vi.mock('../../data/selectors.js', () => ({
  getCustomerById: () => ({ name: 'Sarah Bennett', email: 'sarah.bennett@gmail.com', city: 'Austin', state: 'TX' }),
  getProductById: (id) => ({ id, name: id === 'p01' ? 'Urban Backpack' : 'Travel Organizer' }),
}))

const order = {
  id: 'NX-1042',
  customerId: 'c001',
  status: 'Processing',
  placedAt: '2026-06-01T00:00:00.000Z',
  processingAt: '2026-06-02T00:00:00.000Z',
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  items: [
    { productId: 'p01', quantity: 2, unitPrice: 89 },
    { productId: 'p02', quantity: 1, unitPrice: 34 },
  ],
  total: 212,
}

describe('OrderDetailsDrawer', () => {
  it('renders nothing when no order is selected', () => {
    const { container } = render(<OrderDetailsDrawer order={null} onClose={vi.fn()} onUpdateStatus={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders order id, customer, items with line totals, and order total', () => {
    render(<OrderDetailsDrawer order={order} onClose={vi.fn()} onUpdateStatus={vi.fn()} />)

    expect(screen.getByText('Order NX-1042')).toBeInTheDocument()
    expect(screen.getByText('Sarah Bennett')).toBeInTheDocument()
    expect(screen.getByText('sarah.bennett@gmail.com')).toBeInTheDocument()

    expect(screen.getByText('Urban Backpack')).toBeInTheDocument()
    expect(screen.getByText('Travel Organizer')).toBeInTheDocument()
    // line total for Urban Backpack: 2 * $89 = $178
    expect(screen.getByText('$178.00')).toBeInTheDocument()
    // order total
    expect(screen.getByText('$212.00')).toBeInTheDocument()
  })

  it.each([
    ['Pending', 'Mark as Processing', true],
    ['Processing', 'Mark as Shipped', true],
    ['Shipped', 'Mark as Delivered', false],
    ['Delivered', null, false],
    ['Cancelled', null, false],
  ])('for a %s order: primary action %s, cancel available: %s', (status, primaryLabel, canCancel) => {
    render(<OrderDetailsDrawer order={{ ...order, status }} onClose={vi.fn()} onUpdateStatus={vi.fn()} />)

    if (primaryLabel) {
      expect(screen.getByRole('button', { name: primaryLabel })).toBeInTheDocument()
    }
    // Exactly the expected number of "Mark as ..." buttons: one, or none for terminal states.
    expect(screen.queryAllByRole('button', { name: /^mark as/i })).toHaveLength(primaryLabel ? 1 : 0)

    if (canCancel) {
      expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument()
    } else {
      expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
    }
  })

  it('calls onUpdateStatus with the next status and with Cancelled', () => {
    const onUpdateStatus = vi.fn()
    render(<OrderDetailsDrawer order={order} onClose={vi.fn()} onUpdateStatus={onUpdateStatus} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Shipped' }))
    expect(onUpdateStatus).toHaveBeenLastCalledWith('NX-1042', 'Shipped')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }))
    expect(onUpdateStatus).toHaveBeenLastCalledWith('NX-1042', 'Cancelled')
  })
})
