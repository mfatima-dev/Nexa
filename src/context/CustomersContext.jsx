import { useCallback, useMemo, useRef, useState } from 'react'
import { CUSTOMERS } from '../data/customers.js'
import { generateCustomerId, normalizeCustomerValues, validateCustomer } from '../data/customerRules.js'
import { CustomersContext } from './customersContextInstance.js'

/**
 * Customer records. Nexa ships with 50 seeded customers; `createCustomer` is how a real one gets
 * added — a future Storefront checkout is the intended caller — so that customer shows up on the
 * Customers page and their orders are associated with a real record instead of a dangling id.
 * A duplicate email (case-insensitive) is refused, so the same shopper never gets two records.
 * Re-validates like the products and orders actions, and returns the same { ok, errors?, customer? }
 * shape. `getCustomers()` hands the freshest list to `OrdersContext.placeOrder`, which needs to
 * confirm a customerId is real before creating an order for it (see BusinessProviders).
 * `initialCustomers` exists so tests can start from a known state.
 */
export function CustomersProvider({ children, initialCustomers = CUSTOMERS }) {
  const [customers, setCustomers] = useState(initialCustomers)
  const customersRef = useRef(customers)

  const getCustomers = useCallback(() => customersRef.current, [])

  const createCustomer = useCallback((values) => {
    const errors = validateCustomer(values, customersRef.current)
    if (Object.keys(errors).length > 0) return { ok: false, errors }

    const customer = {
      id: generateCustomerId(customersRef.current),
      ...normalizeCustomerValues(values),
      joinedAt: new Date().toISOString(),
    }
    const next = [...customersRef.current, customer]
    customersRef.current = next
    setCustomers(next)
    return { ok: true, customer }
  }, [])

  const value = useMemo(
    () => ({ customers, getCustomers, createCustomer }),
    [customers, getCustomers, createCustomer],
  )

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>
}
