import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App.jsx'
import { CustomersProvider } from '../../context/CustomersContext.jsx'
import { OrdersProvider } from '../../context/OrdersContext.jsx'
import { CUSTOMERS } from '../../data/customers.js'
import { ORDERS } from '../../data/orders.js'
import { getCustomerOrders, getCustomerStats, getCustomerSummary } from '../../data/selectors.js'
import { formatCurrency } from '../../utils/format.js'
import Customers from './Customers.jsx'

const stats = getCustomerStats(ORDERS)
const summary = getCustomerSummary(stats)

function renderCustomers() {
  return render(
    <MemoryRouter initialEntries={['/customers']}>
      <CustomersProvider>
        <OrdersProvider>
          <Customers />
        </OrdersProvider>
      </CustomersProvider>
    </MemoryRouter>,
  )
}

const rowButtons = () => screen.getAllByRole('button', { name: /^View customer / })
const searchBox = () => screen.getByRole('searchbox', { name: /search customers/i })
const statusSelect = () => screen.getByRole('combobox', { name: /status/i })
const sortSelect = () => screen.getByRole('combobox', { name: /sort/i })
const metricCard = (label) => screen.getByText(label).closest('.metric-card')

describe('Customers page', () => {
  it('renders the header and one page of customers', () => {
    const { container } = renderCustomers()
    expect(screen.getByRole('heading', { name: 'Customers', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Manage customer relationships and purchase history.')).toBeInTheDocument()
    expect(rowButtons()).toHaveLength(10)
    // The mobile card list carries the same customers as the desktop table.
    expect(container.querySelectorAll('.customers-list__card')).toHaveLength(10)
    expect(screen.getByText(`${CUSTOMERS.length} of ${CUSTOMERS.length} customers`)).toBeInTheDocument()
  })

  it('computes its summary metrics from the orders data', () => {
    renderCustomers()
    expect(within(metricCard('Total Customers')).getByText(String(CUSTOMERS.length))).toBeInTheDocument()
    expect(within(metricCard('Total Customers')).getByText(`${summary.customersWithOrders} have placed an order`)).toBeInTheDocument()
    expect(within(metricCard('Active Customers')).getByText(String(summary.activeCustomers))).toBeInTheDocument()
    expect(within(metricCard('Customer Revenue')).getByText(formatCurrency(summary.totalRevenue))).toBeInTheDocument()
    expect(within(metricCard('Avg. Customer Value')).getByText(formatCurrency(summary.averageCustomerValue))).toBeInTheDocument()

    const paidRevenue = ORDERS.filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0)
    expect(summary.totalRevenue).toBeCloseTo(paidRevenue, 2)
  })

  it('searches by customer name', () => {
    renderCustomers()
    const target = stats[3].customer
    fireEvent.change(searchBox(), { target: { value: target.name.toLowerCase() } })

    const expected = stats.filter((e) => e.customer.name.toLowerCase().includes(target.name.toLowerCase()))
    expect(rowButtons()).toHaveLength(expected.length)
    expect(rowButtons()[0]).toHaveTextContent(target.name)
  })

  it('searches by email', () => {
    renderCustomers()
    const target = stats[7].customer
    fireEvent.change(searchBox(), { target: { value: target.email } })

    expect(rowButtons()).toHaveLength(1)
    expect(rowButtons()[0]).toHaveTextContent(target.name)
    expect(screen.getAllByText(target.email).length).toBeGreaterThan(0)
  })

  it('sorts by highest spend', () => {
    renderCustomers()
    fireEvent.change(sortSelect(), { target: { value: 'spend' } })

    const max = Math.max(...stats.map((e) => e.totalSpent))
    expect(rowButtons()[0].getAttribute('aria-label')).toContain(`${formatCurrency(max, { decimals: 2 })} spent`)
  })

  it('sorts by most orders', () => {
    renderCustomers()
    fireEvent.change(sortSelect(), { target: { value: 'orders' } })

    const max = Math.max(...stats.map((e) => e.orderCount))
    expect(rowButtons()[0].getAttribute('aria-label')).toContain(` ${max} orders,`)
  })

  it('sorts by recent activity, newest order first', () => {
    renderCustomers()
    fireEvent.change(sortSelect(), { target: { value: 'recent' } })

    const latest = stats.reduce((best, e) => (new Date(e.lastOrderAt ?? 0) > new Date(best.lastOrderAt ?? 0) ? e : best))
    expect(rowButtons()[0]).toHaveTextContent(latest.customer.name)
  })

  it.each(['Inactive', 'No orders'])('filters by the %s status', (status) => {
    renderCustomers()
    const expected = stats.filter((e) => e.status === status).length
    expect(expected).toBeGreaterThan(0)

    fireEvent.change(statusSelect(), { target: { value: status } })

    const rows = rowButtons()
    expect(rows).toHaveLength(Math.min(10, expected))
    rows.forEach((row) => expect(row.getAttribute('aria-label')).toMatch(new RegExp(`, ${status}$`)))
  })

  it('shows Clear filters only when filters are active, and resets everything', () => {
    renderCustomers()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()

    fireEvent.change(searchBox(), { target: { value: stats[0].customer.name } })
    fireEvent.change(statusSelect(), { target: { value: 'Active' } })
    fireEvent.change(sortSelect(), { target: { value: 'spend' } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(searchBox()).toHaveValue('')
    expect(statusSelect()).toHaveValue('All')
    expect(sortSelect()).toHaveValue('newest')
    expect(rowButtons()).toHaveLength(10)
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('shows an empty state when nothing matches and recovers via Clear filters', () => {
    renderCustomers()
    fireEvent.change(searchBox(), { target: { value: 'zzz-nobody-has-this-name' } })

    expect(screen.getByText('No customers match your filters')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0])

    expect(screen.queryByText('No customers match your filters')).not.toBeInTheDocument()
    expect(rowButtons()).toHaveLength(10)
  })

  it('paginates, and returns to page 1 when a filter changes', () => {
    renderCustomers()
    const totalPages = Math.ceil(CUSTOMERS.length / 10)
    expect(screen.getByText(`Page 1 of ${totalPages}`)).toBeInTheDocument()

    const firstOnPage1 = rowButtons()[0].textContent
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(`Page 2 of ${totalPages}`)).toBeInTheDocument()
    expect(rowButtons()[0].textContent).not.toBe(firstOnPage1)

    fireEvent.change(sortSelect(), { target: { value: 'spend' } })
    expect(screen.getByText(`Page 1 of ${totalPages}`)).toBeInTheDocument()
  })
})

describe('Customer details drawer on the Customers page', () => {
  function openTopCustomerByOrders() {
    fireEvent.change(sortSelect(), { target: { value: 'orders' } })
    const row = rowButtons()[0]
    const entry = stats.find((e) => e.customer.name === row.textContent)
    row.focus()
    fireEvent.click(row)
    return { row, entry }
  }

  it("shows metrics and order history derived from the customer's actual orders", () => {
    renderCustomers()
    const { entry } = openTopCustomerByOrders()
    const dialog = screen.getByRole('dialog', { name: entry.customer.name })
    const stat = (label) => within(dialog).getByText(label).closest('div')

    expect(within(stat('Total orders')).getByText(String(entry.orderCount))).toBeInTheDocument()
    expect(within(stat('Total spent')).getByText(formatCurrency(entry.totalSpent, { decimals: 2 }))).toBeInTheDocument()
    expect(within(stat('Avg. order value')).getByText(formatCurrency(entry.averageOrderValue, { decimals: 2 }))).toBeInTheDocument()
    expect(within(dialog).getByText(entry.customer.email)).toBeInTheDocument()

    const actual = getCustomerOrders(ORDERS, entry.customer.id).slice(0, 5).map((o) => o.id)
    const shown = within(dialog)
      .getAllByRole('link', { name: /NX-\d+/ })
      .map((link) => link.getAttribute('href').split('order=')[1])
    expect(shown).toEqual(actual)
  })

  it('closes with the close button', () => {
    renderCustomers()
    openTopCustomerByOrders()
    fireEvent.click(screen.getByRole('button', { name: 'Close customer details' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes with Escape and returns focus to the customer row', () => {
    renderCustomers()
    const { row } = openTopCustomerByOrders()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(row).toHaveFocus()
  })

  it('explains when a customer has no orders', () => {
    renderCustomers()
    fireEvent.change(statusSelect(), { target: { value: 'No orders' } })
    fireEvent.click(rowButtons()[0])

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText("This customer hasn't placed an order yet.")).toBeInTheDocument()
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('Customers to Orders journey', () => {
  it("opens the existing order details from a customer's order history", () => {
    render(
      <MemoryRouter initialEntries={['/customers']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(sortSelect(), { target: { value: 'orders' } })
    const row = rowButtons()[0]
    const entry = stats.find((e) => e.customer.name === row.textContent)
    fireEvent.click(row)

    const [firstOrder] = getCustomerOrders(ORDERS, entry.customer.id)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: new RegExp(firstOrder.id) }))

    // Landed on the Orders page, whose own drawer shows the order for this customer.
    const orderDialog = screen.getByRole('dialog', { name: `Order ${firstOrder.id}` })
    expect(within(orderDialog).getByText(entry.customer.name)).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: entry.customer.name })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Orders', level: 2 })).toBeInTheDocument()

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
