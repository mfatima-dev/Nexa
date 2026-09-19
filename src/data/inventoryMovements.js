import { ORDERS } from './orders.js'
import { RESTOCK_EVENTS } from './inventoryEvents.js'

export const MOVEMENT_REASONS = {
  restock: 'Restock',
  adjustment: 'Adjustment',
  fulfillment: 'Order fulfillment',
}

/**
 * A stock movement is one signed change to a product's on-hand units:
 *   { id, productId, reason, change, occurredAt, detail, note, orderId }
 * `reason` is restock | adjustment | fulfillment; `detail` is the specific cause ("Damaged or lost");
 * `note` is optional free text from the user; `orderId` is set for fulfillment.
 *
 * The ledger is seeded from data that already exists — the hand-authored restocks and every
 * order that has shipped — so it explains the seeded on-hand numbers without inventing anything
 * new. After that, all changes are appended by ProductsProvider.
 */
export function seedInventoryMovements(orders = ORDERS, restockEvents = RESTOCK_EVENTS, now = new Date()) {
  const restocks = restockEvents.map((event) => ({
    id: event.id,
    productId: event.productId,
    reason: 'restock',
    change: event.quantity,
    occurredAt: event.occurredAt,
    detail: 'Supplier delivery',
    note: '',
    orderId: null,
  }))

  const fulfillments = []
  orders.forEach((order) => {
    if (!order.shippedAt) return
    // Seeded ship dates can run slightly ahead of "now"; stock can't move in the future.
    const occurredAt = new Date(order.shippedAt) > now ? now.toISOString() : order.shippedAt
    order.items.forEach((item) => {
      fulfillments.push({
        id: `mv-${order.id}-${item.productId}`,
        productId: item.productId,
        reason: 'fulfillment',
        change: -item.quantity,
        occurredAt,
        detail: 'Order shipped',
        note: '',
        orderId: order.id,
      })
    })
  })

  return [...restocks, ...fulfillments]
}

export const SEED_INVENTORY_MOVEMENTS = seedInventoryMovements()
