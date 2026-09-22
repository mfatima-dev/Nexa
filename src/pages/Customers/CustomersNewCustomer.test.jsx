import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BusinessProviders } from '../../context/BusinessProviders.jsx'
import { useCustomers } from '../../context/useCustomers.js'
import { useOrders } from '../../context/useOrders.js'
import { useProducts } from '../../context/useProducts.js'
import Customers from './Customers.jsx'

// Nexa has no Storefront yet, so this stands in for it: create a customer, then place an order for
// them, through the real business-state actions — the same two calls a future checkout would make.
const NEW_CUSTOMER = {
  name: 'Nina Torres',
  email: 'nina.torres@example.com',
  phone: '555-0100',
  shippingAddress: { street: '12 Elm St', city: 'Austin', state: 'TX', zip: '78701' },
}

function StorefrontStandIn() {
  const { createCustomer } = useCustomers()
  const { placeOrder } = useOrders()
  const { products } = useProducts()

  return (
    <button
      type="button"
      onClick={() => {
        const { customer } = createCustomer(NEW_CUSTOMER)
        placeOrder({ customerId: customer.id, items: [{ productId: products[0].id, quantity: 2 }] })
      }}
    >
      Place a demo storefront order
    </button>
  )
}

function renderCustomersWithStorefrontStandIn() {
  return render(
    <MemoryRouter initialEntries={['/customers']}>
      <BusinessProviders>
        <StorefrontStandIn />
        <Customers />
      </BusinessProviders>
    </MemoryRouter>,
  )
}

const searchBox = () => screen.getByRole('searchbox', { name: /search customers/i })
const setValue = (element, value) => fireEvent.change(element, { target: { value } })
const rowButtons = () => screen.getAllByRole('button', { name: /^View customer / })
const metricCard = (label) => screen.getByText(label).closest('.metric-card')

describe('the Customers page after a new customer places their first order', () => {
  it('lists the new customer, found by name, with their order counted', () => {
    renderCustomersWithStorefrontStandIn()
    const before = Number(metricCard('Total Customers').querySelector('.metric-card__value').textContent)

    fireEvent.click(screen.getByRole('button', { name: 'Place a demo storefront order' }))

    expect(Number(metricCard('Total Customers').querySelector('.metric-card__value').textContent)).toBe(before + 1)

    setValue(searchBox(), 'Nina Torres')
    const rows = rowButtons()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveAccessibleName(/Nina Torres — 1 orders?,/)
  })

  it('opens to their real details, with the order in their history', () => {
    renderCustomersWithStorefrontStandIn()
    fireEvent.click(screen.getByRole('button', { name: 'Place a demo storefront order' }))

    setValue(searchBox(), 'Nina Torres')
    fireEvent.click(rowButtons()[0])

    const dialog = screen.getByRole('dialog', { name: 'Nina Torres' })
    expect(within(dialog).getByText('nina.torres@example.com')).toBeInTheDocument()
    expect(within(dialog).getByText('Austin, TX')).toBeInTheDocument()
    expect(within(dialog).queryByText('This customer hasn’t placed an order yet.')).not.toBeInTheDocument()
    const totalOrders = within(dialog).getByText('Total orders').closest('div')
    expect(within(totalOrders).getByText('1')).toBeInTheDocument()
    expect(within(dialog).getAllByText('$178.00').length).toBeGreaterThan(0) // 2 units of the first product
  })

  it('counts them as Active, since their order was just placed', () => {
    renderCustomersWithStorefrontStandIn()
    fireEvent.click(screen.getByRole('button', { name: 'Place a demo storefront order' }))

    setValue(searchBox(), 'Nina Torres')
    fireEvent.click(rowButtons()[0])
    expect(within(screen.getByRole('dialog', { name: 'Nina Torres' })).getByText('Active')).toBeInTheDocument()
  })
})
