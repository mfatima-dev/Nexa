import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { getCustomerStats } from '../data/selectors.js'
import { BusinessProviders } from './BusinessProviders.jsx'
import { useCustomers } from './useCustomers.js'
import { useOrders } from './useOrders.js'
import { useProducts } from './useProducts.js'

// A future Storefront's path: create the customer, then place an order for them — through the real
// providers, wired exactly as the app wires them.
function setup() {
  return renderHook(() => ({ ...useOrders(), ...useProducts(), ...useCustomers() }), {
    wrapper: ({ children }) => <BusinessProviders>{children}</BusinessProviders>,
  })
}

const VALUES = {
  name: 'Nina Torres',
  email: 'nina.torres@example.com',
  phone: '555-0100',
  shippingAddress: { street: '12 Elm St', city: 'Austin', state: 'TX', zip: '78701' },
}

function createCustomer(result, values = VALUES) {
  let outcome
  act(() => {
    outcome = result.current.createCustomer(values)
  })
  return outcome
}

function placeOrder(result, customerId, items) {
  let outcome
  act(() => {
    outcome = result.current.placeOrder({ customerId, items })
  })
  return outcome
}

describe('placing an order for a newly created customer', () => {
  it('succeeds, and the order is associated with the new customer’s real id', () => {
    const { result } = setup()
    const { customer } = createCustomer(result)
    const product = result.current.products[0]

    const outcome = placeOrder(result, customer.id, [{ productId: product.id, quantity: 1 }])

    expect(outcome.ok).toBe(true)
    expect(outcome.order.customerId).toBe(customer.id)
    expect(outcome.order.status).toBe('Pending')
    expect(result.current.orders).toContainEqual(outcome.order)
  })

  it('the new customer appears in getCustomerStats, with the order correctly counted', () => {
    const { result } = setup()
    const { customer } = createCustomer(result)
    const product = result.current.products[0]
    placeOrder(result, customer.id, [{ productId: product.id, quantity: 2 }])

    const stats = getCustomerStats(result.current.orders, new Date(), result.current.customers)
    const entry = stats.find((candidate) => candidate.customer.id === customer.id)

    expect(entry).toBeDefined()
    expect(entry.customer).toBe(customer)
    expect(entry.orderCount).toBe(1)
    expect(entry.status).toBe('Active')
  })

  it('a second order for the same new customer is also associated with them', () => {
    const { result } = setup()
    const { customer } = createCustomer(result)
    const [a, b] = result.current.products

    placeOrder(result, customer.id, [{ productId: a.id, quantity: 1 }])
    placeOrder(result, customer.id, [{ productId: b.id, quantity: 1 }])

    const theirOrders = result.current.orders.filter((order) => order.customerId === customer.id)
    expect(theirOrders).toHaveLength(2)
  })
})

describe('placeOrder refuses a customerId that is not a real customer', () => {
  it('a customer id nobody has created', () => {
    const { result } = setup()
    const product = result.current.products[0]
    const before = result.current.orders.length

    const outcome = placeOrder(result, 'c999', [{ productId: product.id, quantity: 1 }])

    expect(outcome.ok).toBe(false)
    expect(outcome.errors.customerId).toBeDefined()
    expect(result.current.orders).toHaveLength(before)
  })

  it('a customer id that was rejected at creation (duplicate email) is never usable', () => {
    const { result } = setup()
    const seeded = result.current.customers[0]
    const rejected = createCustomer(result, { ...VALUES, email: seeded.email })
    expect(rejected.ok).toBe(false)

    const outcome = placeOrder(result, 'c051', [{ productId: result.current.products[0].id, quantity: 1 }])
    expect(outcome.ok).toBe(false)
    expect(outcome.errors.customerId).toBeDefined()
  })

  it('still accepts a seeded customer, unaffected by the new validation', () => {
    const { result } = setup()
    const seeded = result.current.customers[0]
    const outcome = placeOrder(result, seeded.id, [{ productId: result.current.products[0].id, quantity: 1 }])
    expect(outcome.ok).toBe(true)
    expect(outcome.order.customerId).toBe(seeded.id)
  })
})
