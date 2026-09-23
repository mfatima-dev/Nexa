import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import App from './App.jsx'

// Moves between routes the way in-app links do: client-side, with no page load. A typed URL or a
// refresh reloads the app and re-seeds every provider, so it can never carry in-memory state across.
let navigate
function NavProbe() {
  const nav = useNavigate()
  useEffect(() => {
    navigate = nav
  }, [nav])
  return null
}

function renderApp(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <NavProbe />
      <App />
    </MemoryRouter>,
  )
}

const goTo = (path) => act(() => navigate(path))
const setValue = (element, value) => fireEvent.change(element, { target: { value } })

const SHOPPER = {
  name: 'Priya Nandakumar',
  email: 'priya.nandakumar@example.com',
  phone: '555-3030',
  street: '88 Harbor Way',
  city: 'Seattle',
  state: 'WA',
  zip: '98101',
}

// The real Storefront flow, end to end: add a product, open the cart, check out, fill in the form, place the order.
function placeStorefrontOrder() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Urban Backpack to cart' }))
  fireEvent.click(screen.getByRole('link', { name: /^Cart, \d+ items/ }))
  fireEvent.click(screen.getByRole('link', { name: 'Checkout' }))
  Object.entries(SHOPPER).forEach(([field, value]) => setValue(document.getElementById(`checkout-${field}`), value))
  fireEvent.click(screen.getByRole('button', { name: /Place order/ }))
  expect(screen.getByRole('heading', { name: 'Order confirmed' })).toBeInTheDocument()
  return document.querySelector('.sf-confirmation__copy').textContent.match(/NX-\d+/)[0]
}

function orderRowFor(orderId) {
  return screen.queryByRole('button', { name: new RegExp(`View order ${orderId} `) })
}

const totalOrders = () => Number(screen.getByRole('button', { name: /^Total:/ }).getAttribute('aria-label').match(/: (\d+) orders/)[1])

describe('Storefront → shared state → Admin (one SPA session)', () => {
  it('an order placed on the storefront appears in Admin Orders, raises the count, and is found by the customer name', () => {
    renderApp('/orders')
    const before = totalOrders()

    goTo('/store/shop')
    const orderId = placeStorefrontOrder()

    goTo('/orders')
    expect(totalOrders()).toBe(before + 1)
    expect(orderRowFor(orderId)).toHaveAccessibleName(new RegExp(SHOPPER.name))

    fireEvent.change(screen.getByRole('searchbox', { name: /search orders/i }), { target: { value: SHOPPER.name } })
    const rows = screen.getAllByRole('button', { name: /view order/i })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveAccessibleName(new RegExp(orderId))
  })

  it('the storefront customer appears in Admin Customers', () => {
    renderApp('/store/shop')
    placeStorefrontOrder()

    goTo('/customers')
    expect(screen.getAllByText(SHOPPER.name).length).toBeGreaterThan(0)
  })

  it('the order stays visible while moving back and forth between Storefront and Admin', () => {
    renderApp('/store/shop')
    const orderId = placeStorefrontOrder()

    goTo('/orders')
    expect(orderRowFor(orderId)).toBeInTheDocument()
    goTo('/store/shop')
    goTo('/orders')
    expect(orderRowFor(orderId)).toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryAllByText(/Unknown customer/)).toHaveLength(0)
  })
})
