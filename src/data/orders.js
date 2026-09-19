import { PRODUCTS } from './products.js'
import { SEED_CUSTOMERS } from './customerSeed.js'
import { createSeededRandom } from '../utils/seededRandom.js'

const random = createSeededRandom(7)
const ORDER_COUNT = 150
const HISTORY_DAYS = 270

function randomInt(min, max) {
  return Math.floor(min + random() * (max - min + 1))
}

function pick(list) {
  return list[randomInt(0, list.length - 1)]
}

// Skews toward recent days so order volume trends upward, matching a growing business.
function pickDayOffset() {
  const skewed = Math.pow(random(), 1.6)
  return Math.floor(skewed * HISTORY_DAYS)
}

// Recent orders haven't finished their lifecycle yet; older orders have mostly resolved.
function pickStatus(dayOffset) {
  if (dayOffset <= 1) return pick(['Pending', 'Pending', 'Processing'])
  if (dayOffset <= 3) return pick(['Processing', 'Processing', 'Shipped', 'Pending'])
  if (dayOffset <= 7) return pick(['Shipped', 'Shipped', 'Delivered', 'Processing'])
  return pick([
    'Delivered', 'Delivered', 'Delivered', 'Delivered',
    'Delivered', 'Delivered', 'Delivered', 'Shipped', 'Cancelled',
  ])
}

function buildOrderItems() {
  const itemCount = randomInt(1, 4)
  const chosenIds = new Set()
  const items = []

  while (items.length < itemCount) {
    const product = pick(PRODUCTS)
    if (chosenIds.has(product.id)) continue
    chosenIds.add(product.id)
    // Name and unit price are snapshots: order history stays readable if the product is later deleted.
    items.push({
      productId: product.id,
      productName: product.name,
      quantity: randomInt(1, 3),
      unitPrice: product.price,
    })
  }

  return items
}

// One reference time for the whole dataset, so no order can be stamped after the moment it was generated.
const SEED_TIME = new Date()
const FIRST_ORDER_HOUR = 8
const LAST_ORDER_HOUR = 20
const ORDER_WINDOW_MINUTES = (LAST_ORDER_HOUR - FIRST_ORDER_HOUR + 1) * 60

// Orders are placed during the day, 08:00-20:59. For today that hour may not have happened yet, so a
// time later than now is scaled proportionally into today's window [08:00, now] (or [00:00, now] before
// 08:00), keeping the order in the dataset. Times that are already in the past are left as drawn.
function pickPlacedAt(dayOffset) {
  const placed = new Date(SEED_TIME)
  placed.setDate(placed.getDate() - dayOffset)
  const hour = randomInt(FIRST_ORDER_HOUR, LAST_ORDER_HOUR)
  const minute = randomInt(0, 59)
  placed.setHours(hour, minute, 0, 0)
  if (placed <= SEED_TIME) return placed

  const windowStart = new Date(SEED_TIME)
  windowStart.setHours(FIRST_ORDER_HOUR, 0, 0, 0)
  if (windowStart >= SEED_TIME) windowStart.setHours(0, 0, 0, 0)
  const position = ((hour - FIRST_ORDER_HOUR) * 60 + minute) / ORDER_WINDOW_MINUTES
  const capped = new Date(windowStart.getTime() + position * (SEED_TIME - windowStart))
  capped.setSeconds(0, 0)
  return capped
}

function buildRawOrder() {
  const dayOffset = pickDayOffset()
  const placed = pickPlacedAt(dayOffset)

  const status = pickStatus(dayOffset)
  const items = buildOrderItems()
  const total = Number(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2))
  const customer = pick(SEED_CUSTOMERS)

  let shippedAt = null
  let deliveredAt = null

  // Shipping and delivery are always 1+ days after placement, so they can never precede placedAt.
  if (status === 'Shipped' || status === 'Delivered') {
    const shipped = new Date(placed)
    shipped.setDate(shipped.getDate() + randomInt(1, 2))
    shippedAt = shipped
  }
  if (status === 'Delivered') {
    const delivered = new Date(shippedAt)
    delivered.setDate(delivered.getDate() + randomInt(1, 3))
    deliveredAt = delivered
  }

  return {
    customerId: customer.id,
    status,
    placed,
    shippedAt,
    deliveredAt,
    items,
    total,
  }
}

const rawOrders = Array.from({ length: ORDER_COUNT }, buildRawOrder).sort((a, b) => a.placed - b.placed)

export const ORDERS = rawOrders.map((order, index) => ({
  id: `NX-${1000 + index}`,
  customerId: order.customerId,
  status: order.status,
  placedAt: order.placed.toISOString(),
  shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
  deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
  items: order.items,
  total: order.total,
}))
