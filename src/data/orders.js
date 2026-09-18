import { PRODUCTS } from './products.js'
import { CUSTOMERS } from './customers.js'
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
    items.push({ productId: product.id, quantity: randomInt(1, 3), unitPrice: product.price })
  }

  return items
}

function buildRawOrder() {
  const dayOffset = pickDayOffset()
  const placed = new Date()
  placed.setDate(placed.getDate() - dayOffset)
  placed.setHours(randomInt(8, 20), randomInt(0, 59), 0, 0)

  const status = pickStatus(dayOffset)
  const items = buildOrderItems()
  const total = Number(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2))
  const customer = pick(CUSTOMERS)

  let shippedAt = null
  let deliveredAt = null

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
