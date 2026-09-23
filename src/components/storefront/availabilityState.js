// The line between "in stock" and "worth mentioning" — low stock is called out (same idea as the
// admin's Low stock threshold), out of stock is explicit, and plentiful stock says nothing at all.
const LOW_STOCK_THRESHOLD = 8

export function getAvailabilityState(available) {
  if (available <= 0) return 'out'
  if (available <= LOW_STOCK_THRESHOLD) return 'low'
  return 'in'
}
