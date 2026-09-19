import { PRODUCT_CATEGORIES } from './products.js'

export const PRODUCT_STATUSES = ['active', 'discontinued']

export const STATUS_LABELS = { active: 'Active', discontinued: 'Discontinued' }

export const STOCK_LEVELS = ['In stock', 'Low stock', 'Out of stock']

/** Out of stock at 0 units; low stock once units on hand reach the product's threshold. */
export function getStockLevel(product) {
  if (product.stock <= 0) return 'Out of stock'
  if (product.stock <= product.lowStockThreshold) return 'Low stock'
  return 'In stock'
}

/** Gross margin per unit as a fraction of price (0.57 = 57%). */
export function getMargin(product) {
  return product.price > 0 ? (product.price - product.cost) / product.price : 0
}

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,23}$/
const NAME_MAX = 80
const PRICE_MAX = 100000
const STOCK_MAX = 1000000

function idNumber(id) {
  const match = /^p(\d+)$/.exec(id)
  return match ? Number(match[1]) : 0
}

/** Highest numeric id in use, e.g. 22 for p22. */
export function highestProductNumber(products) {
  return products.reduce((max, product) => Math.max(max, idNumber(product.id)), 0)
}

/**
 * Next id, e.g. p23. `highestEverUsed` is the largest number ever issued this session: ids are
 * never reused after a deletion, or a new product would inherit the deleted one's order history.
 */
export function generateProductId(products, highestEverUsed = 0) {
  const next = Math.max(highestProductNumber(products), highestEverUsed) + 1
  return `p${String(next).padStart(2, '0')}`
}

/** Suggests an unused SKU in the catalog's NX-<CAT>-<NN> style. */
export function suggestSku(category, products) {
  const code = (category || 'GEN').slice(0, 3).toUpperCase()
  const taken = new Set(products.map((product) => product.sku.toUpperCase()))
  let number = products.reduce((max, product) => Math.max(max, idNumber(product.id)), 0) + 1
  let sku = `NX-${code}-${String(number).padStart(2, '0')}`
  while (taken.has(sku)) {
    number += 1
    sku = `NX-${code}-${String(number).padStart(2, '0')}`
  }
  return sku
}

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || value.trim() === '') return NaN
  return Number(value)
}

/**
 * Validates raw form values (strings) against the catalog. Returns { field: message }.
 * An empty object means valid. `editingId` excludes the product being edited from uniqueness checks.
 */
export function validateProduct(values, products, editingId = null) {
  const errors = {}
  const others = products.filter((product) => product.id !== editingId)

  const name = String(values.name ?? '').trim()
  if (!name) errors.name = 'Enter a product name.'
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`
  else if (others.some((product) => product.name.trim().toLowerCase() === name.toLowerCase())) {
    errors.name = 'A product with this name already exists.'
  }

  const sku = String(values.sku ?? '').trim().toUpperCase()
  if (!sku) errors.sku = 'Enter a SKU.'
  else if (!SKU_PATTERN.test(sku)) errors.sku = 'Use letters, numbers and dashes only (e.g. NX-BAG-23).'
  else if (others.some((product) => product.sku.toUpperCase() === sku)) errors.sku = 'This SKU is already in use.'

  if (!PRODUCT_CATEGORIES.includes(values.category)) errors.category = 'Choose a category.'

  const price = toNumber(values.price)
  if (Number.isNaN(price)) errors.price = 'Enter a price.'
  else if (price <= 0) errors.price = 'Price must be greater than $0.'
  else if (price > PRICE_MAX) errors.price = 'Price is too high.'

  const cost = toNumber(values.cost)
  if (Number.isNaN(cost)) errors.cost = 'Enter a unit cost.'
  else if (cost < 0) errors.cost = 'Cost can’t be negative.'
  else if (!errors.price && cost > price) errors.cost = 'Cost can’t be higher than the price.'

  const stock = toNumber(values.stock)
  if (Number.isNaN(stock)) errors.stock = 'Enter the units in stock.'
  else if (!Number.isInteger(stock) || stock < 0) errors.stock = 'Stock must be a whole number, 0 or more.'
  else if (stock > STOCK_MAX) errors.stock = 'Stock is too high.'

  const threshold = toNumber(values.lowStockThreshold)
  if (Number.isNaN(threshold)) errors.lowStockThreshold = 'Enter a low-stock threshold.'
  else if (!Number.isInteger(threshold) || threshold < 0) {
    errors.lowStockThreshold = 'Threshold must be a whole number, 0 or more.'
  }

  if (!PRODUCT_STATUSES.includes(values.status)) errors.status = 'Choose a status.'

  return errors
}

/** Converts validated form values into the stored product shape. */
export function normalizeProductValues(values) {
  return {
    name: String(values.name).trim(),
    sku: String(values.sku).trim().toUpperCase(),
    category: values.category,
    price: Math.round(toNumber(values.price) * 100) / 100,
    cost: Math.round(toNumber(values.cost) * 100) / 100,
    stock: toNumber(values.stock),
    lowStockThreshold: toNumber(values.lowStockThreshold),
    status: values.status,
  }
}
