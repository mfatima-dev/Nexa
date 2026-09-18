// Forward-only lifecycle. Cancellation is a separate branch, only from states
// where cancelling still makes business sense (nothing has shipped yet).
const NEXT_STATUS = {
  Pending: 'Processing',
  Processing: 'Shipped',
  Shipped: 'Delivered',
}

const CANCELLABLE_FROM = new Set(['Pending', 'Processing'])

export function getNextStatus(status) {
  return NEXT_STATUS[status] ?? null
}

export function canCancelOrder(status) {
  return CANCELLABLE_FROM.has(status)
}

export function isValidTransition(currentStatus, nextStatus) {
  if (nextStatus === getNextStatus(currentStatus)) return true
  if (nextStatus === 'Cancelled') return canCancelOrder(currentStatus)
  return false
}

export function applyStatusChange(order, nextStatus, now) {
  const iso = now.toISOString()
  const updated = { ...order, status: nextStatus }

  if (nextStatus === 'Processing') updated.processingAt = updated.processingAt ?? iso
  if (nextStatus === 'Shipped') updated.shippedAt = updated.shippedAt ?? iso
  if (nextStatus === 'Delivered') updated.deliveredAt = updated.deliveredAt ?? iso
  if (nextStatus === 'Cancelled') updated.cancelledAt = updated.cancelledAt ?? iso

  return updated
}
