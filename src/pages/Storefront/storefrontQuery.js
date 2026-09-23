// Read-only helpers shared across the storefront pages. Availability is never duplicated here —
// everything defers to src/data/availability.js, the one authority for what can still be sold.
import { getAvailableUnits } from '../../data/availability.js'

/** Only active products can be purchased or shown for sale. */
export function getSellableProducts(products) {
  return products.filter((product) => product.status === 'active')
}

export function getProductsByCategory(products, category) {
  return getSellableProducts(products).filter((product) => product.category === category)
}

/** A handful of active products to headline the homepage: the highest-priced, so the page opens strong. */
export function getFeaturedProducts(products, limit = 6) {
  return [...getSellableProducts(products)].sort((a, b) => b.price - a.price).slice(0, limit)
}

/** Units still available to sell right now: on hand minus what open orders have already committed. */
export function getAvailability(product, products, orders) {
  return getAvailableUnits(product.id, products, orders)
}

// Nexa has no marketing copy yet, so each product gets a short, honest line built from what it is.
const CATEGORY_LINES = {
  Bags: 'Considered materials and construction built for everyday carry.',
  Travel: 'Made to move — durable, well-organized, ready for the trip ahead.',
  Accessories: 'A small detail that makes daily use a little easier.',
  Tech: 'Keeps your gear organized, protected and ready to go.',
}

export function getProductDescription(product) {
  const line = CATEGORY_LINES[product.category] ?? 'Part of the Nexa collection.'
  return `${product.name} from Nexa's ${product.category} collection. ${line}`
}

export function findSellableProduct(products, productId) {
  return getSellableProducts(products).find((product) => product.id === productId) ?? null
}
