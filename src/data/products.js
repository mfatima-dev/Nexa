import { daysAgoISO } from '../utils/date.js'

export const PRODUCT_CATEGORIES = ['Bags', 'Travel', 'Accessories', 'Tech']

/**
 * Nexa's fictional catalog. `stock` is units on hand; a product is "low stock" once
 * stock falls to `lowStockThreshold` or below. `cost` is landed unit cost, so
 * price - cost is the gross margin per unit. Sales figures are NOT stored here —
 * they are always derived from orders.
 */
export const PRODUCTS = [
  { id: 'p01', name: 'Urban Backpack', category: 'Bags', price: 89, cost: 38, stock: 142, lowStockThreshold: 40, sku: 'NX-BAG-01', status: 'active', createdAt: daysAgoISO(255) },
  { id: 'p02', name: 'Travel Organizer', category: 'Travel', price: 34, cost: 14, stock: 210, lowStockThreshold: 50, sku: 'NX-TRA-02', status: 'active', createdAt: daysAgoISO(255) },
  { id: 'p03', name: 'Leather Weekender', category: 'Bags', price: 189, cost: 82, stock: 58, lowStockThreshold: 60, sku: 'NX-BAG-03', status: 'active', createdAt: daysAgoISO(250) },
  { id: 'p04', name: 'City Bottle', category: 'Accessories', price: 28, cost: 10, stock: 305, lowStockThreshold: 60, sku: 'NX-ACC-04', status: 'active', createdAt: daysAgoISO(250) },
  { id: 'p05', name: 'Everyday Tote', category: 'Bags', price: 69, cost: 28, stock: 176, lowStockThreshold: 40, sku: 'NX-BAG-05', status: 'active', createdAt: daysAgoISO(248) },
  { id: 'p06', name: 'Passport Wallet', category: 'Accessories', price: 32, cost: 11, stock: 240, lowStockThreshold: 50, sku: 'NX-ACC-06', status: 'active', createdAt: daysAgoISO(248) },
  { id: 'p07', name: 'Tech Organizer', category: 'Tech', price: 42, cost: 16, stock: 190, lowStockThreshold: 40, sku: 'NX-TEC-07', status: 'active', createdAt: daysAgoISO(240) },
  { id: 'p08', name: 'Commuter Messenger Bag', category: 'Bags', price: 99, cost: 41, stock: 88, lowStockThreshold: 90, sku: 'NX-BAG-08', status: 'active', createdAt: daysAgoISO(235) },
  { id: 'p09', name: 'Packing Cubes Set', category: 'Travel', price: 38, cost: 14, stock: 260, lowStockThreshold: 60, sku: 'NX-TRA-09', status: 'active', createdAt: daysAgoISO(230) },
  { id: 'p10', name: 'Laptop Sleeve 14"', category: 'Tech', price: 45, cost: 17, stock: 150, lowStockThreshold: 35, sku: 'NX-TEC-10', status: 'active', createdAt: daysAgoISO(20) },
  { id: 'p11', name: 'Canvas Duffel', category: 'Bags', price: 129, cost: 54, stock: 64, lowStockThreshold: 30, sku: 'NX-BAG-11', status: 'active', createdAt: daysAgoISO(210) },
  { id: 'p12', name: 'Minimalist Cardholder', category: 'Accessories', price: 22, cost: 7, stock: 320, lowStockThreshold: 80, sku: 'NX-ACC-12', status: 'active', createdAt: daysAgoISO(200) },
  { id: 'p13', name: 'Travel Pillow', category: 'Travel', price: 26, cost: 9, stock: 198, lowStockThreshold: 45, sku: 'NX-TRA-13', status: 'active', createdAt: daysAgoISO(190) },
  { id: 'p14', name: 'Wireless Charging Pad', category: 'Tech', price: 36, cost: 15, stock: 175, lowStockThreshold: 40, sku: 'NX-TEC-14', status: 'active', createdAt: daysAgoISO(40) },
  { id: 'p15', name: 'Crossbody Sling Bag', category: 'Bags', price: 59, cost: 24, stock: 132, lowStockThreshold: 35, sku: 'NX-BAG-15', status: 'active', createdAt: daysAgoISO(170) },
  { id: 'p16', name: 'Luggage Tag Set', category: 'Travel', price: 14, cost: 4, stock: 410, lowStockThreshold: 100, sku: 'NX-TRA-16', status: 'active', createdAt: daysAgoISO(160) },
  { id: 'p17', name: 'Cable Organizer Pouch', category: 'Tech', price: 19, cost: 6, stock: 265, lowStockThreshold: 60, sku: 'NX-TEC-17', status: 'active', createdAt: daysAgoISO(150) },
  { id: 'p18', name: 'Insulated Lunch Bag', category: 'Accessories', price: 32, cost: 13, stock: 205, lowStockThreshold: 45, sku: 'NX-ACC-18', status: 'active', createdAt: daysAgoISO(140) },
  { id: 'p19', name: 'Rolling Carry-On', category: 'Travel', price: 219, cost: 104, stock: 40, lowStockThreshold: 50, sku: 'NX-TRA-19', status: 'active', createdAt: daysAgoISO(65) },
  { id: 'p20', name: 'Key Pouch', category: 'Accessories', price: 16, cost: 5, stock: 355, lowStockThreshold: 80, sku: 'NX-ACC-20', status: 'active', createdAt: daysAgoISO(120) },
  { id: 'p21', name: 'Foldable Tote', category: 'Bags', price: 24, cost: 9, stock: 96, lowStockThreshold: 25, sku: 'NX-BAG-21', status: 'discontinued', createdAt: daysAgoISO(255) },
  { id: 'p22', name: 'Desk Organizer Tray', category: 'Tech', price: 29, cost: 12, stock: 0, lowStockThreshold: 20, sku: 'NX-TEC-22', status: 'discontinued', createdAt: daysAgoISO(255) },
]
