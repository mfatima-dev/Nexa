// Stock availability and order reservations. Everything here is derived from the shared orders and
// products; nothing is stored. An order reserves its units from the moment it is placed until it ships
// or is cancelled. Physical stock (`product.stock`) only changes when an order ships.

// Placed but not yet shipped: these orders hold stock for their customers. Shipped and Delivered orders
// have already taken their units out of stock, and Cancelled orders hold nothing.
const OPEN_ORDER_STATUSES = new Set(['Pending', 'Processing'])

export function isOpenOrder(order) {
  return OPEN_ORDER_STATUSES.has(order.status)
}

/** Units of a product held by open (Pending or Processing) orders. */
export function getCommittedUnits(productId, orders) {
  return orders.reduce((total, order) => {
    if (!isOpenOrder(order)) return total
    return order.items.reduce((sum, item) => (item.productId === productId ? sum + item.quantity : sum), total)
  }, 0)
}

/** Units that can still be promised to a new order: on hand minus committed, never below zero. */
export function getAvailableUnits(productId, products, orders) {
  const product = products.find((candidate) => candidate.id === productId)
  if (!product) return 0
  return Math.max(0, product.stock - getCommittedUnits(productId, orders))
}

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || value.trim() === '') return NaN
  return Number(value)
}

function validateLine(item, index, items, products, orders) {
  const errors = {}
  const line = item && typeof item === 'object' ? item : {}
  const product = products.find((candidate) => candidate.id === line.productId)

  if (!product) errors.productId = 'This product isn’t available.'
  else if (product.status === 'discontinued') errors.productId = 'This product is discontinued.'
  else if (items.findIndex((other) => other?.productId === line.productId) !== index) {
    errors.productId = 'Each product can only be added once.'
  }

  const quantity = toNumber(line.quantity)
  if (Number.isNaN(quantity)) errors.quantity = 'Enter a quantity.'
  else if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = 'Quantity must be a whole number, 1 or more.'
  else if (!errors.productId) {
    const available = getAvailableUnits(product.id, products, orders)
    if (quantity > available) errors.quantity = available === 0 ? 'Out of stock.' : `Only ${available} available.`
  }

  return Object.keys(errors).length > 0 ? errors : null
}

/**
 * Validates a request to place an order: [{ productId, quantity }, ...]. Returns
 * `{ items?: message, lines?: [errors | null, ...] }`; an empty object means every line can be
 * fulfilled from what is available right now. `lines` lines up with the request, so a caller can show
 * each message next to its line. One bad line makes the whole request invalid.
 */
export function validateOrderRequest(items, products, orders) {
  if (!Array.isArray(items) || items.length === 0) return { items: 'Add at least one item.' }

  const lines = items.map((item, index) => validateLine(item, index, items, products, orders))
  return lines.some(Boolean) ? { lines } : {}
}

/**
 * Why a manual change of the on-hand count is not allowed, or null when it is. Stock can't be reduced
 * below the units committed to open orders: those units are promised to customers. Only a reduction
 * is checked, so a product that is already short of its commitments can still have other fields
 * edited, be restocked, or be corrected upward.
 */
export function getStockReductionError(productId, currentStock, newStock, orders) {
  if (newStock >= currentStock) return null

  const committed = getCommittedUnits(productId, orders)
  if (newStock >= committed) return null

  return `${committed} ${committed === 1 ? 'unit is' : 'units are'} committed to open orders. On hand can’t go below ${committed}.`
}
