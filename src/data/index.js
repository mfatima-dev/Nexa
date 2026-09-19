export { PRODUCTS, PRODUCT_CATEGORIES } from './products.js'
export { CUSTOMERS } from './customers.js'
export { ORDERS } from './orders.js'
export { RESTOCK_EVENTS } from './inventoryEvents.js'
export { RANGE_OPTIONS } from './ranges.js'
export {
  PRODUCT_STATUSES,
  STATUS_LABELS,
  STOCK_LEVELS,
  getStockLevel,
  getMargin,
  generateProductId,
  suggestSku,
  validateProduct,
  normalizeProductValues,
} from './productRules.js'
export {
  computeOverviewMetrics,
  getProductCatalogSummary,
  getProductSales,
  getProductStats,
  getProductSummary,
  getOrderStatusCounts,
  ACTIVE_CUSTOMER_WINDOW_DAYS,
  getCustomerStats,
  getCustomerSummary,
  getCustomerOrders,
  getCustomerById,
  buildRevenueSeries,
  getTopProducts,
  getRecentOrders,
  getRecentActivity,
} from './selectors.js'
