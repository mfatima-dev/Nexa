export { PRODUCTS, PRODUCT_CATEGORIES } from './products.js'
export { CUSTOMERS } from './customers.js'
export { ORDERS } from './orders.js'
export { RESTOCK_EVENTS } from './inventoryEvents.js'
export { MOVEMENT_REASONS, SEED_INVENTORY_MOVEMENTS, seedInventoryMovements } from './inventoryMovements.js'
export { ADJUSTMENT_REASONS, validateAdjustment, validateRestock } from './inventoryRules.js'
export {
  getInventoryStats,
  getInventoryStatus,
  getProductMovements,
  getRecentInventoryActivity,
  movementLabel,
} from './inventorySelectors.js'
export { RANGE_OPTIONS } from './ranges.js'
export {
  REMOVED_PRODUCTS_LABEL,
  buildAnalyticsSeries,
  getAnalyticsInsights,
  getAnalyticsMetrics,
  getAnalyticsReport,
  getAnalyticsWindow,
  getCategoryPerformance,
  getTopProductsInRange,
} from './analyticsSelectors.js'
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
