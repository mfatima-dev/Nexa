import { daysAgoISO } from '../utils/date.js'

// Hand-authored restock log (order-derived activity covers the rest of the feed).
export const RESTOCK_EVENTS = [
  { id: 'inv001', productId: 'p01', quantity: 60, occurredAt: daysAgoISO(2) },
  { id: 'inv002', productId: 'p11', quantity: 40, occurredAt: daysAgoISO(5) },
  { id: 'inv003', productId: 'p19', quantity: 25, occurredAt: daysAgoISO(9) },
  { id: 'inv004', productId: 'p07', quantity: 80, occurredAt: daysAgoISO(14) },
  { id: 'inv005', productId: 'p15', quantity: 50, occurredAt: daysAgoISO(21) },
  { id: 'inv006', productId: 'p03', quantity: 20, occurredAt: daysAgoISO(27) },
]
