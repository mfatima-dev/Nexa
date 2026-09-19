import { SEED_CUSTOMERS } from './customerSeed.js'
import { ORDERS } from './orders.js'

const DAY_MS = 24 * 60 * 60 * 1000

const firstOrderAt = new Map()
ORDERS.forEach((order) => {
  const placed = new Date(order.placedAt).getTime()
  const known = firstOrderAt.get(order.customerId)
  if (known === undefined || placed < known) firstOrderAt.set(order.customerId, placed)
})

/**
 * The customer list used across Nexa. A customer can't have ordered before they joined, so any
 * seeded join date that falls after the customer's first order is moved to 1-14 days before it
 * (a deterministic gap per customer). Orders are the source of truth and are never altered here.
 */
export const CUSTOMERS = SEED_CUSTOMERS.map((customer, index) => {
  const first = firstOrderAt.get(customer.id)
  if (first === undefined) return customer

  const latestAllowed = first - (1 + (index % 14)) * DAY_MS
  if (new Date(customer.joinedAt).getTime() <= latestAllowed) return customer
  return { ...customer, joinedAt: new Date(latestAllowed).toISOString() }
})
