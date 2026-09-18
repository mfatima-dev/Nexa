import { daysAgoISO } from '../utils/date.js'

// Nexa's fictional retail/e-commerce catalog: bags, travel goods, accessories, and tech organizers.
export const PRODUCTS = [
  { id: 'p01', name: 'Urban Backpack', category: 'Bags', price: 89, stock: 142, sku: 'NX-BAG-01', status: 'active', createdAt: daysAgoISO(255) },
  { id: 'p02', name: 'Travel Organizer', category: 'Travel', price: 34, stock: 210, sku: 'NX-TRA-02', status: 'active', createdAt: daysAgoISO(255) },
  { id: 'p03', name: 'Leather Weekender', category: 'Bags', price: 189, stock: 58, sku: 'NX-BAG-03', status: 'active', createdAt: daysAgoISO(250) },
  { id: 'p04', name: 'City Bottle', category: 'Accessories', price: 28, stock: 305, sku: 'NX-ACC-04', status: 'active', createdAt: daysAgoISO(250) },
  { id: 'p05', name: 'Everyday Tote', category: 'Bags', price: 69, stock: 176, sku: 'NX-BAG-05', status: 'active', createdAt: daysAgoISO(248) },
  { id: 'p06', name: 'Passport Wallet', category: 'Accessories', price: 32, stock: 240, sku: 'NX-ACC-06', status: 'active', createdAt: daysAgoISO(248) },
  { id: 'p07', name: 'Tech Organizer', category: 'Tech', price: 42, stock: 190, sku: 'NX-TEC-07', status: 'active', createdAt: daysAgoISO(240) },
  { id: 'p08', name: 'Commuter Messenger Bag', category: 'Bags', price: 99, stock: 88, sku: 'NX-BAG-08', status: 'active', createdAt: daysAgoISO(235) },
  { id: 'p09', name: 'Packing Cubes Set', category: 'Travel', price: 38, stock: 260, sku: 'NX-TRA-09', status: 'active', createdAt: daysAgoISO(230) },
  { id: 'p10', name: 'Laptop Sleeve 14"', category: 'Tech', price: 45, stock: 150, sku: 'NX-TEC-10', status: 'active', createdAt: daysAgoISO(20) },
  { id: 'p11', name: 'Canvas Duffel', category: 'Bags', price: 129, stock: 64, sku: 'NX-BAG-11', status: 'active', createdAt: daysAgoISO(210) },
  { id: 'p12', name: 'Minimalist Cardholder', category: 'Accessories', price: 22, stock: 320, sku: 'NX-ACC-12', status: 'active', createdAt: daysAgoISO(200) },
  { id: 'p13', name: 'Travel Pillow', category: 'Travel', price: 26, stock: 198, sku: 'NX-TRA-13', status: 'active', createdAt: daysAgoISO(190) },
  { id: 'p14', name: 'Wireless Charging Pad', category: 'Tech', price: 36, stock: 175, sku: 'NX-TEC-14', status: 'active', createdAt: daysAgoISO(40) },
  { id: 'p15', name: 'Crossbody Sling Bag', category: 'Bags', price: 59, stock: 132, sku: 'NX-BAG-15', status: 'active', createdAt: daysAgoISO(170) },
  { id: 'p16', name: 'Luggage Tag Set', category: 'Travel', price: 14, stock: 410, sku: 'NX-TRA-16', status: 'active', createdAt: daysAgoISO(160) },
  { id: 'p17', name: 'Cable Organizer Pouch', category: 'Tech', price: 19, stock: 265, sku: 'NX-TEC-17', status: 'active', createdAt: daysAgoISO(150) },
  { id: 'p18', name: 'Insulated Lunch Bag', category: 'Accessories', price: 32, stock: 205, sku: 'NX-ACC-18', status: 'active', createdAt: daysAgoISO(140) },
  { id: 'p19', name: 'Rolling Carry-On', category: 'Travel', price: 219, stock: 40, sku: 'NX-TRA-19', status: 'active', createdAt: daysAgoISO(65) },
  { id: 'p20', name: 'Key Pouch', category: 'Accessories', price: 16, stock: 355, sku: 'NX-ACC-20', status: 'active', createdAt: daysAgoISO(120) },
  { id: 'p21', name: 'Foldable Tote', category: 'Bags', price: 24, stock: 96, sku: 'NX-BAG-21', status: 'discontinued', createdAt: daysAgoISO(255) },
  { id: 'p22', name: 'Desk Organizer Tray', category: 'Tech', price: 29, stock: 0, sku: 'NX-TEC-22', status: 'discontinued', createdAt: daysAgoISO(255) },
]
