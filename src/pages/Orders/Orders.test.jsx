import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { OrdersProvider } from '../../context/OrdersContext.jsx'
import Orders from './Orders.jsx'

function renderOrders() {
  return render(
    <OrdersProvider>
      <Orders />
    </OrdersProvider>,
  )
}

describe('Orders page', () => {
  it('renders the page header and order rows from context data', () => {
    renderOrders()
    expect(screen.getByRole('heading', { name: 'Orders', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /view order/i }).length).toBeGreaterThan(0)
  })

  it('filters results as the user types in search', () => {
    renderOrders()
    const search = screen.getByRole('searchbox', { name: /search orders/i })

    fireEvent.change(search, { target: { value: 'NX-1000' } })

    const rows = screen.getAllByRole('button', { name: /view order/i })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveAccessibleName(/NX-1000/)
  })

  it('shows an empty state when no order matches, and Clear filters restores the list', () => {
    renderOrders()
    const search = screen.getByRole('searchbox', { name: /search orders/i })

    fireEvent.change(search, { target: { value: 'no such order or customer at all' } })

    expect(screen.getByText('No orders match your filters')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0])

    expect(screen.queryByText('No orders match your filters')).not.toBeInTheDocument()
    expect(search).toHaveValue('')
    expect(screen.getAllByRole('button', { name: /view order/i }).length).toBeGreaterThan(0)
  })

  it('opens the details drawer when an order row is activated', () => {
    renderOrders()
    const [firstRow] = screen.getAllByRole('button', { name: /view order/i })

    fireEvent.click(firstRow)

    expect(screen.getByRole('dialog', { name: /order nx-/i })).toBeInTheDocument()
  })
})

function summaryCard(label) {
  return screen.getByRole('button', { name: new RegExp(`^${label}:`) })
}

function summaryCount(label) {
  return Number(summaryCard(label).getAttribute('aria-label').match(/: (\d+) orders/)[1])
}

describe('Orders page status summary cards', () => {
  it('shows counts derived from the orders data that add up to the total', () => {
    renderOrders()
    const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
    const sum = statuses.reduce((total, status) => total + summaryCount(status), 0)
    expect(sum).toBe(summaryCount('Total'))
  })

  it('filters the list to a status when its card is clicked, and marks the card selected', () => {
    renderOrders()
    expect(summaryCard('Total')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(summaryCard('Pending'))

    expect(summaryCard('Pending')).toHaveAttribute('aria-pressed', 'true')
    expect(summaryCard('Total')).toHaveAttribute('aria-pressed', 'false')
    const rows = screen.getAllByRole('button', { name: /view order/i })
    expect(rows.length).toBe(Math.min(10, summaryCount('Pending')))
    rows.forEach((row) => expect(row.getAttribute('aria-label')).toMatch(/, Pending$/))
    expect(screen.getByRole('combobox', { name: /status/i })).toHaveValue('Pending')
  })

  it('returns to all statuses when Total is clicked', () => {
    renderOrders()
    fireEvent.click(summaryCard('Cancelled'))
    fireEvent.click(summaryCard('Total'))

    expect(summaryCard('Total')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('combobox', { name: /status/i })).toHaveValue('All')
    expect(screen.getAllByRole('button', { name: /view order/i })).toHaveLength(10)
  })

  it('resets pagination to page 1 but keeps the search text', () => {
    renderOrders()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/page 2 of/i)).toBeInTheDocument()

    fireEvent.click(summaryCard('Delivered'))
    expect(screen.getByText(/page 1 of/i)).toBeInTheDocument()

    const search = screen.getByRole('searchbox', { name: /search orders/i })
    fireEvent.change(search, { target: { value: 'NX-10' } })
    fireEvent.click(summaryCard('Shipped'))
    expect(search).toHaveValue('NX-10')
  })
})

describe('Orders page status changes', () => {
  it('advances a Shipped order to Delivered and updates the drawer, timeline, table and counts', () => {
    renderOrders()
    const shippedBefore = summaryCount('Shipped')
    const deliveredBefore = summaryCount('Delivered')

    fireEvent.click(summaryCard('Shipped'))
    const [firstRow] = screen.getAllByRole('button', { name: /view order/i })
    const orderId = firstRow.getAttribute('aria-label').match(/NX-\d+/)[0]
    fireEvent.click(firstRow)

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark as Delivered' }))

    // Drawer: status, no further actions, timeline fully complete, focus stays inside.
    expect(within(dialog).getAllByText('Delivered').length).toBeGreaterThan(0)
    expect(within(dialog).queryByRole('button', { name: /mark as/i })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
    expect(dialog.querySelectorAll('.status-timeline__step--done')).toHaveLength(4)
    expect(dialog.contains(document.activeElement)).toBe(true)

    // Table + summary: the order left the Shipped list and counts moved.
    expect(screen.queryByRole('button', { name: new RegExp(`View order ${orderId} `) })).not.toBeInTheDocument()
    expect(summaryCount('Shipped')).toBe(shippedBefore - 1)
    expect(summaryCount('Delivered')).toBe(deliveredBefore + 1)
  })

  it('cancels a Pending order and removes all further actions', () => {
    renderOrders()
    fireEvent.click(summaryCard('Pending'))
    fireEvent.click(screen.getAllByRole('button', { name: /view order/i })[0])

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Mark as Processing' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }))

    expect(within(dialog).queryByRole('button', { name: /mark as/i })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
    expect(dialog.querySelector('.status-timeline__step--cancelled')).not.toBeNull()
  })
})
