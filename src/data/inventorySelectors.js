import { MOVEMENT_REASONS } from './inventoryMovements.js'
import { getProductStats } from './selectors.js'
import { formatSignedChange } from '../utils/format.js'

/**
 * The status shown in the Inventory table. Discontinued products aren't restocked, so they are
 * reported as such instead of raising a stock alert; this matches the alert counts in the
 * summary (which only count active products), so filters and metrics always agree.
 */
export function getInventoryStatus(product, stockLevel) {
  return product.status === 'discontinued' ? 'Discontinued' : stockLevel
}

function roundCurrency(value) {
  return Number(value.toFixed(2))
}

/** One entry per product: the Products stats plus its stock value (on hand x unit cost) and status. */
export function getInventoryStats(products, orders) {
  return getProductStats(products, orders).map((entry) => ({
    ...entry,
    stockValue: roundCurrency(entry.product.stock * entry.product.cost),
    status: getInventoryStatus(entry.product, entry.stockLevel),
  }))
}

/**
 * A product's movements, newest first, each with the on-hand balance right after it. Balances are
 * derived by walking back from the current stock, so they always agree with it.
 */
export function getProductMovements(movements, product) {
  const own = movements
    .map((movement, index) => ({ movement, index }))
    .filter(({ movement }) => movement.productId === product.id)
    .sort((a, b) => new Date(b.movement.occurredAt) - new Date(a.movement.occurredAt) || b.index - a.index)

  let balance = product.stock
  return own.map(({ movement }) => {
    const entry = { ...movement, balanceAfter: balance }
    balance -= movement.change
    return entry
  })
}

const ACTIVITY_TYPES = {
  restock: 'inventory_restocked',
  adjustment: 'inventory_adjusted',
  fulfillment: 'inventory_fulfilled',
}

function describe(movement, name) {
  const signed = formatSignedChange(movement.change)
  if (movement.reason === 'restock') return `${name}: ${signed} units received`
  if (movement.reason === 'fulfillment') return `${name}: ${signed} for order ${movement.orderId}`
  return `${name}: stock ${signed} (${movement.detail})`
}

/** Recent stock movements across all products, as activity-feed items. Deleted products are skipped. */
export function getRecentInventoryActivity(movements, products, limit = 8) {
  const productsById = new Map(products.map((product) => [product.id, product]))

  return movements
    .map((movement, index) => ({ movement, index }))
    .filter(({ movement }) => productsById.has(movement.productId))
    .sort((a, b) => new Date(b.movement.occurredAt) - new Date(a.movement.occurredAt) || b.index - a.index)
    .slice(0, limit)
    .map(({ movement }) => ({
      id: movement.id,
      type: ACTIVITY_TYPES[movement.reason] ?? 'inventory_adjusted',
      message: describe(movement, productsById.get(movement.productId).name),
      occurredAt: movement.occurredAt,
    }))
}

export function movementLabel(movement) {
  return MOVEMENT_REASONS[movement.reason] ?? 'Adjustment'
}
