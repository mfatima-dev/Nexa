import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { CustomersProvider } from './CustomersContext.jsx'
import { useCustomers } from './useCustomers.js'

const START = [
  { id: 'c001', name: 'Sarah Bennett', email: 'sarah.bennett@gmail.com', city: 'Austin', state: 'TX', joinedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'c002', name: 'James Carter', email: 'james.carter@outlook.com', city: 'Denver', state: 'CO', joinedAt: '2026-01-02T00:00:00.000Z' },
]

const VALUES = {
  name: 'Nina Torres',
  email: 'nina.torres@example.com',
  phone: '555-0100',
  shippingAddress: { street: '12 Elm St', city: 'Austin', state: 'TX', zip: '78701' },
}

function setup(initialCustomers = START) {
  return renderHook(() => useCustomers(), {
    wrapper: ({ children }) => <CustomersProvider initialCustomers={initialCustomers}>{children}</CustomersProvider>,
  })
}

describe('CustomersProvider', () => {
  it('starts from the seeded customer list by default', () => {
    const { result } = renderHook(() => useCustomers(), { wrapper: CustomersProvider })
    expect(result.current.customers.length).toBeGreaterThan(0)
  })

  it('throws outside a provider', () => {
    expect(() => renderHook(() => useCustomers())).toThrow(/within a CustomersProvider/)
  })

  it('preserves every seeded customer untouched', () => {
    const { result } = setup()
    expect(result.current.customers).toEqual(START)
  })

  it('creates a customer with an id, and the minimum required fields', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.createCustomer(VALUES)
    })

    expect(outcome.ok).toBe(true)
    expect(outcome.customer).toMatchObject({
      id: 'c003',
      name: 'Nina Torres',
      email: 'nina.torres@example.com',
      phone: '555-0100',
      shippingAddress: { street: '12 Elm St', city: 'Austin', state: 'TX', zip: '78701' },
    })
    expect(new Date(outcome.customer.joinedAt).getTime()).not.toBeNaN()
    expect(result.current.customers).toHaveLength(3)
    expect(result.current.customers.at(-1)).toBe(outcome.customer)
  })

  it('mirrors city and state at the top level, so the customer displays like a seeded one', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.createCustomer(VALUES)
    })
    expect(outcome.customer.city).toBe('Austin')
    expect(outcome.customer.state).toBe('TX')
  })

  it('rejects a duplicate email, case-insensitively, and changes nothing', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.createCustomer({ ...VALUES, email: '  Sarah.Bennett@GMAIL.com  ' })
    })

    expect(outcome.ok).toBe(false)
    expect(outcome.errors.email).toMatch(/already exists/)
    expect(result.current.customers).toEqual(START)
  })

  it('rejects an incomplete submission and creates nothing', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.createCustomer({ name: 'No Email' })
    })

    expect(outcome.ok).toBe(false)
    expect(outcome.errors.email).toBeDefined()
    expect(result.current.customers).toHaveLength(2)
  })

  it('lets two different, real emails both become customers, and never reuses an id', () => {
    const { result } = setup()
    let first
    let second
    act(() => {
      first = result.current.createCustomer(VALUES)
      second = result.current.createCustomer({ ...VALUES, email: 'other@example.com' })
    })

    expect(first.customer.id).toBe('c003')
    expect(second.customer.id).toBe('c004')
    expect(new Set(result.current.customers.map((customer) => customer.id)).size).toBe(4)
  })

  it('a second attempt with the same email as one just created is also rejected', () => {
    const { result } = setup()
    act(() => {
      result.current.createCustomer(VALUES)
    })
    let outcome
    act(() => {
      outcome = result.current.createCustomer(VALUES)
    })
    expect(outcome.ok).toBe(false)
    expect(outcome.errors.email).toMatch(/already exists/)
    expect(result.current.customers).toHaveLength(3)
  })

  it('getCustomers reflects the freshest list, including one created a moment earlier in the same tick', () => {
    const { result } = setup()
    let seen
    act(() => {
      result.current.createCustomer(VALUES)
      seen = result.current.getCustomers()
    })
    expect(seen.map((customer) => customer.id)).toContain('c003')
  })
})
