import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { getAvailableUnits, getCommittedUnits } from '../data/availability.js'
import { ORDERS } from '../data/orders.js'
import { PRODUCTS } from '../data/products.js'
import { BusinessProviders } from './BusinessProviders.jsx'
import { ProductsProvider } from './ProductsContext.jsx'
import { useOrders } from './useOrders.js'
import { useProducts } from './useProducts.js'

const catalogProduct = (fields) => ({
  category: 'Bags',
  cost: 40,
  lowStockThreshold: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
  ...fields,
})
const CATALOG = [
  catalogProduct({ id: 'px', name: 'Limited Bag', sku: 'NX-BAG-90', price: 100, stock: 6 }),
  catalogProduct({ id: 'py', name: 'Plenty Tote', sku: 'NX-BAG-91', price: 25.5, stock: 50 }),
  catalogProduct({ id: 'old', name: 'Retired Sling', sku: 'NX-BAG-92', price: 60, stock: 10, status: 'discontinued' }),
]

// The real providers wired exactly as the app wires them. The ledger starts empty so a test can see every movement.
function setup(initialProducts = CATALOG) {
  return renderHook(() => ({ ...useOrders(), ...useProducts() }), {
    wrapper: ({ children }) => (
      <BusinessProviders initialProducts={initialProducts} initialMovements={[]}>
        {children}
      </BusinessProviders>
    ),
  })
}

const stockOf = (result, id) => result.current.products.find((product) => product.id === id).stock
const committed = (result, id) => getCommittedUnits(id, result.current.orders)
const available = (result, id) => getAvailableUnits(id, result.current.products, result.current.orders)
const request = (productId, quantity) => ({ productId, quantity })

function place(result, items, customerId = 'c001') {
  let outcome
  act(() => {
    outcome = result.current.placeOrder({ customerId, items })
  })
  return outcome
}

const move = (result, orderId, status) => act(() => result.current.updateOrderStatus(orderId, status))

// Everything a rejected placement must leave exactly as it was.
function snapshot(result) {
  return JSON.stringify({ orders: result.current.orders, products: result.current.products, movements: result.current.movements })
}

describe('placeOrder: a valid order', () => {
  it('creates a Pending order and returns it', () => {
    const { result } = setup()
    const before = result.current.orders.length
    const outcome = place(result, [request('px', 2)])

    expect(outcome.ok).toBe(true)
    expect(outcome.order.status).toBe('Pending')
    expect(result.current.orders).toHaveLength(before + 1)
    expect(result.current.orders.at(-1)).toBe(outcome.order)
    expect(outcome.order).toMatchObject({ customerId: 'c001', shippedAt: null, deliveredAt: null })
  })

  it('snapshots each product’s name and unit price into the order lines, and totals them', () => {
    const { result } = setup()
    const { order } = place(result, [request('px', 2), request('py', '3')])

    expect(order.items).toEqual([
      { productId: 'px', productName: 'Limited Bag', quantity: 2, unitPrice: 100 },
      { productId: 'py', productName: 'Plenty Tote', quantity: 3, unitPrice: 25.5 },
    ])
    expect(order.total).toBe(276.5)
  })

  it('keeps the snapshot when the product is later renamed or repriced', () => {
    const { result } = setup()
    const { order } = place(result, [request('px', 1)])
    act(() => {
      result.current.updateProduct('px', { ...CATALOG[0], name: 'Renamed Bag', price: '999', cost: '40', stock: '6', lowStockThreshold: '2' })
    })

    const stored = result.current.orders.find((candidate) => candidate.id === order.id)
    expect(stored.items[0]).toMatchObject({ productName: 'Limited Bag', unitPrice: 100 })
    expect(stored.total).toBe(100)
  })

  it('stamps the time it was placed', () => {
    const { result } = setup()
    const start = Date.now()
    const { order } = place(result, [request('px', 1)])
    const placed = new Date(order.placedAt).getTime()
    expect(placed).toBeGreaterThanOrEqual(start)
    expect(placed).toBeLessThanOrEqual(Date.now())
  })

  it('gives each order the next id after the highest existing one, never reusing one', () => {
    const { result } = setup()
    const highest = Math.max(...ORDERS.map((order) => Number(order.id.slice(3))))
    const first = place(result, [request('py', 1)]).order
    const second = place(result, [request('py', 1)]).order

    expect(first.id).toBe(`NX-${highest + 1}`)
    expect(second.id).toBe(`NX-${highest + 2}`)
    expect(new Set(result.current.orders.map((order) => order.id)).size).toBe(result.current.orders.length)
  })

  it('does NOT change physical stock or write to the ledger', () => {
    const { result } = setup()
    const stockBefore = result.current.products.map((product) => product.stock)
    const movementsBefore = result.current.movements.length

    place(result, [request('px', 5), request('py', 10)])

    expect(result.current.products.map((product) => product.stock)).toEqual(stockBefore)
    expect(result.current.movements).toHaveLength(movementsBefore)
  })

  it('reserves the units instead: they become committed and leave what is available', () => {
    const { result } = setup()
    place(result, [request('px', 4)])
    expect(stockOf(result, 'px')).toBe(6)
    expect(committed(result, 'px')).toBe(4)
    expect(available(result, 'px')).toBe(2)
  })
})

describe('placeOrder: a request that is rejected creates nothing', () => {
  function expectRejected(items, check, customerId = 'c001') {
    const { result } = setup()
    const before = snapshot(result)
    const outcome = place(result, items, customerId)

    expect(outcome.ok).toBe(false)
    expect(outcome.order).toBeUndefined()
    check(outcome.errors)
    expect(snapshot(result)).toBe(before)
  }

  it('a product that does not exist', () => {
    expectRejected([request('ghost', 1)], (errors) => expect(errors.lines[0].productId).toBeDefined())
  })

  it('a discontinued product', () => {
    expectRejected([request('old', 1)], (errors) => expect(errors.lines[0].productId).toMatch(/discontinued/))
  })

  it('a quantity below 1', () => {
    expectRejected([request('px', 0)], (errors) => expect(errors.lines[0].quantity).toBeDefined())
    expectRejected([request('px', -3)], (errors) => expect(errors.lines[0].quantity).toBeDefined())
  })

  it('a quantity that is not a whole number', () => {
    expectRejected([request('px', 1.5)], (errors) => expect(errors.lines[0].quantity).toMatch(/whole number/))
  })

  it('more than is available', () => {
    expectRejected([request('px', 7)], (errors) => expect(errors.lines[0].quantity).toBe('Only 6 available.'))
  })

  it('an empty request', () => {
    expectRejected([], (errors) => expect(errors.items).toBeDefined())
    expectRejected(undefined, (errors) => expect(errors.items).toBeDefined())
  })

  it('a missing customer', () => {
    expectRejected([request('px', 1)], (errors) => expect(errors.customerId).toBeDefined(), '')
    expectRejected([request('px', 1)], (errors) => expect(errors.customerId).toBeDefined(), null)
  })

  it('a multi-line order where one line is unavailable: nothing is created, even for the valid lines', () => {
    expectRejected([request('py', 2), request('px', 7), request('py', 1)], (errors) => {
      expect(errors.lines[0]).toBeNull()
      expect(errors.lines[1].quantity).toBe('Only 6 available.')
    })
  })

  it('a valid line beside a discontinued one reserves nothing', () => {
    const { result } = setup()
    place(result, [request('px', 2), request('old', 1)])
    expect(committed(result, 'px')).toBe(0)
    expect(available(result, 'px')).toBe(6)
  })

  it('calling placeOrder with no argument at all fails cleanly', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.placeOrder()
    })
    expect(outcome.ok).toBe(false)
  })
})

describe('the audit scenario: stock 6, two orders of 5', () => {
  it('accepts the first, rejects the second (1 available), and physical stock stays 6', () => {
    const { result } = setup()
    expect(stockOf(result, 'px')).toBe(6)

    const first = place(result, [request('px', 5)])
    expect(first.ok).toBe(true)
    expect(available(result, 'px')).toBe(1)

    const second = place(result, [request('px', 5)])
    expect(second.ok).toBe(false)
    expect(second.errors.lines[0].quantity).toBe('Only 1 available.')

    expect(stockOf(result, 'px')).toBe(6)
    expect(committed(result, 'px')).toBe(5)
    expect(result.current.movements).toHaveLength(0)
    expect(result.current.orders.filter((order) => order.items.some((item) => item.productId === 'px'))).toHaveLength(1)
  })

  it('still allows the last unit to be sold, then sells out', () => {
    const { result } = setup()
    place(result, [request('px', 5)])
    expect(place(result, [request('px', 1)]).ok).toBe(true)

    const sellOut = place(result, [request('px', 1)])
    expect(sellOut.ok).toBe(false)
    expect(sellOut.errors.lines[0].quantity).toBe('Out of stock.')
    expect(available(result, 'px')).toBe(0)
    expect(stockOf(result, 'px')).toBe(6)
  })

  it('holds when both orders are placed in the same instant: the second sees the first', () => {
    const { result } = setup()
    let first
    let second
    act(() => {
      first = result.current.placeOrder({ customerId: 'c001', items: [request('px', 5)] })
      second = result.current.placeOrder({ customerId: 'c002', items: [request('px', 5)] })
    })

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
    expect(second.errors.lines[0].quantity).toBe('Only 1 available.')
    expect(stockOf(result, 'px')).toBe(6)
  })

  it('a rejected order does not use up an order id', () => {
    const { result } = setup()
    const first = place(result, [request('px', 5)]).order
    place(result, [request('px', 5)])
    const next = place(result, [request('px', 1)]).order
    expect(Number(next.id.slice(3))).toBe(Number(first.id.slice(3)) + 1)
  })
})

describe('the commitment follows the order status', () => {
  it('a Pending order is committed', () => {
    const { result } = setup()
    place(result, [request('px', 5)])
    expect(committed(result, 'px')).toBe(5)
  })

  it('a Processing order is still committed', () => {
    const { result } = setup()
    const { order } = place(result, [request('px', 5)])
    move(result, order.id, 'Processing')

    expect(result.current.orders.find((candidate) => candidate.id === order.id).status).toBe('Processing')
    expect(committed(result, 'px')).toBe(5)
    expect(place(result, [request('px', 5)]).ok).toBe(false)
  })

  it('cancelling a Pending order releases the commitment, so the units can be sold again', () => {
    const { result } = setup()
    const { order } = place(result, [request('px', 5)])
    expect(place(result, [request('px', 5)]).ok).toBe(false)

    move(result, order.id, 'Cancelled')

    expect(committed(result, 'px')).toBe(0)
    expect(available(result, 'px')).toBe(6)
    expect(place(result, [request('px', 5)]).ok).toBe(true)
    expect(stockOf(result, 'px')).toBe(6) // cancelling never moves stock
    expect(result.current.movements).toHaveLength(0)
  })

  it('cancelling a Processing order releases the commitment too', () => {
    const { result } = setup()
    const { order } = place(result, [request('px', 5)])
    move(result, order.id, 'Processing')
    expect(available(result, 'px')).toBe(1)

    move(result, order.id, 'Cancelled')

    expect(committed(result, 'px')).toBe(0)
    expect(available(result, 'px')).toBe(6)
    expect(place(result, [request('px', 6)]).ok).toBe(true)
  })

  it('shipping deducts the physical stock (as before) and the commitment ends, leaving availability unchanged', () => {
    const { result } = setup()
    const { order } = place(result, [request('px', 5)])
    move(result, order.id, 'Processing')
    expect(available(result, 'px')).toBe(1)

    move(result, order.id, 'Shipped')

    expect(stockOf(result, 'px')).toBe(1) // 6 on hand, 5 shipped
    expect(committed(result, 'px')).toBe(0)
    expect(available(result, 'px')).toBe(1) // reserved-then-shipped units never come back
    expect(result.current.movements).toEqual([
      expect.objectContaining({ productId: 'px', reason: 'fulfillment', change: -5, orderId: order.id, note: '' }),
    ])
  })

  it('delivering changes neither stock nor availability', () => {
    const { result } = setup()
    const { order } = place(result, [request('px', 5)])
    move(result, order.id, 'Processing')
    move(result, order.id, 'Shipped')
    const before = [stockOf(result, 'px'), available(result, 'px'), result.current.movements.length]

    move(result, order.id, 'Delivered')

    expect([stockOf(result, 'px'), available(result, 'px'), result.current.movements.length]).toEqual(before)
  })

  it('a product that was shipped short (stock clamped) is still handled by the existing fulfillment rules', () => {
    const { result } = setup()
    const { order } = place(result, [request('px', 6)])
    move(result, order.id, 'Processing')
    move(result, order.id, 'Shipped')
    expect(stockOf(result, 'px')).toBe(0)
    expect(available(result, 'px')).toBe(0)
  })
})

describe('manual stock changes cannot go below the committed units', () => {
  const adjust = (result, newQuantity, reason = 'Stock count correction') => {
    let outcome
    act(() => {
      outcome = result.current.adjustProductStock('px', { newQuantity: String(newQuantity), reason, note: '' })
    })
    return outcome
  }
  const editStock = (result, stock, overrides = {}) => {
    let outcome
    act(() => {
      outcome = result.current.updateProduct('px', {
        name: 'Limited Bag',
        sku: 'NX-BAG-90',
        category: 'Bags',
        price: '100',
        cost: '40',
        lowStockThreshold: '2',
        status: 'active',
        stock: String(stock),
        ...overrides,
      })
    })
    return outcome
  }

  it('rejects a stock adjustment below the committed units, without touching stock or the ledger', () => {
    const { result } = setup()
    place(result, [request('px', 5)])
    const before = snapshot(result)

    const outcome = adjust(result, 4, 'Damaged or lost')

    expect(outcome.ok).toBe(false)
    expect(outcome.errors.newQuantity).toBe('5 units are committed to open orders. On hand can’t go below 5.')
    expect(outcome.movement).toBeUndefined()
    expect(snapshot(result)).toBe(before)
    expect(stockOf(result, 'px')).toBe(6)
    expect(result.current.movements).toHaveLength(0)
  })

  it('rejects the same reduction made by editing the stock field on the Products page', () => {
    const { result } = setup()
    place(result, [request('px', 5)])
    const before = snapshot(result)

    const outcome = editStock(result, 2)

    expect(outcome.ok).toBe(false)
    expect(outcome.errors.stock).toMatch(/5 units are committed/)
    expect(snapshot(result)).toBe(before)
  })

  it('allows a reduction down to exactly the committed units, and records it', () => {
    const { result } = setup()
    place(result, [request('px', 5)])

    const outcome = adjust(result, 5)

    expect(outcome.ok).toBe(true)
    expect(stockOf(result, 'px')).toBe(5)
    expect(result.current.movements).toEqual([expect.objectContaining({ productId: 'px', reason: 'adjustment', change: -1 })])
    expect(available(result, 'px')).toBe(0)
  })

  it('allows a reduction above the committed units, from either place', () => {
    const { result } = setup()
    place(result, [request('px', 3)])

    expect(adjust(result, 4).ok).toBe(true)
    expect(stockOf(result, 'px')).toBe(4)
    expect(editStock(result, 3).ok).toBe(true)
    expect(stockOf(result, 'px')).toBe(3)
    expect(result.current.movements).toHaveLength(2)
  })

  it('then blocks the next reduction, because the floor is exactly the commitment', () => {
    const { result } = setup()
    place(result, [request('px', 5)])
    expect(adjust(result, 5).ok).toBe(true)
    expect(adjust(result, 4).ok).toBe(false)
    expect(stockOf(result, 'px')).toBe(5)
  })

  it('allows a product with no open orders to be reduced to zero', () => {
    const { result } = setup()
    expect(adjust(result, 0).ok).toBe(true)
    expect(stockOf(result, 'px')).toBe(0)
  })

  it('only counts open orders: shipped, delivered and cancelled orders do not hold stock', () => {
    const { result } = setup()
    const shipped = place(result, [request('px', 2)]).order
    const cancelled = place(result, [request('px', 2)]).order
    move(result, shipped.id, 'Processing')
    move(result, shipped.id, 'Shipped') // stock 4
    move(result, cancelled.id, 'Cancelled')

    expect(adjust(result, 0).ok).toBe(true)
  })

  it('unblocks the reduction once the order is cancelled', () => {
    const { result } = setup()
    const { order } = place(result, [request('px', 5)])
    expect(adjust(result, 1).ok).toBe(false)

    move(result, order.id, 'Cancelled')

    expect(adjust(result, 1).ok).toBe(true)
    expect(stockOf(result, 'px')).toBe(1)
  })

  it('does not restrict raising stock: a restock, a correction upward, or an edit that adds units', () => {
    const { result } = setup()
    place(result, [request('px', 6)])
    let restock
    act(() => {
      restock = result.current.restockProduct('px', { quantity: '10', note: '' })
    })
    expect(restock.ok).toBe(true)
    expect(stockOf(result, 'px')).toBe(16)
    expect(adjust(result, 20).ok).toBe(true)
    expect(editStock(result, 25).ok).toBe(true)
    expect(stockOf(result, 'px')).toBe(25)
  })

  it('still lets a product that is already short of its commitments be edited, restocked and corrected upward', () => {
    // Real seed data: the discontinued Desk Organizer Tray has 0 on hand but 1 unit committed to an open order.
    const { result } = setup(PRODUCTS)
    const tray = result.current.products.find((product) => product.id === 'p22')
    expect([tray.stock, committed(result, 'p22')]).toEqual([0, 1])

    let renamed
    act(() => {
      renamed = result.current.updateProduct('p22', {
        name: 'Desk Organizer Tray XL',
        sku: tray.sku,
        category: tray.category,
        price: String(tray.price),
        cost: String(tray.cost),
        stock: String(tray.stock),
        lowStockThreshold: String(tray.lowStockThreshold),
        status: tray.status,
      })
    })
    expect(renamed.ok).toBe(true)
    expect(renamed.product.name).toBe('Desk Organizer Tray XL')

    let restocked
    act(() => {
      restocked = result.current.restockProduct('p22', { quantity: '2', note: '' })
    })
    expect(restocked.ok).toBe(true)
    expect(stockOf(result, 'p22')).toBe(2)
  })

  it('does not restrict the products provider when it is used on its own, with no orders to read', () => {
    const { result } = renderHook(() => useProducts(), {
      wrapper: ({ children }) => <ProductsProvider initialProducts={CATALOG}>{children}</ProductsProvider>,
    })
    let outcome
    act(() => {
      outcome = result.current.adjustProductStock('px', { newQuantity: '0', reason: 'Damaged or lost', note: '' })
    })
    expect(outcome.ok).toBe(true)
  })
})

describe('getProducts returns the freshest products', () => {
  it('reflects a change made a moment earlier in the same tick', () => {
    const { result } = setup()
    let seen
    act(() => {
      result.current.restockProduct('px', { quantity: '4', note: '' })
      seen = result.current.getProducts().find((product) => product.id === 'px').stock
    })
    expect(seen).toBe(10)
  })
})

describe('against the real seed data', () => {
  it('refuses the discontinued seed product and honours the units the seed orders already committed', () => {
    const { result } = setup(PRODUCTS)
    // A real product that the seed's open orders have already reserved units of.
    const target = PRODUCTS.find((product) => product.status === 'active' && getCommittedUnits(product.id, ORDERS) > 0)
    const seedCommitted = committed(result, target.id)
    const seedAvailable = available(result, target.id)
    expect(seedCommitted).toBeGreaterThan(0)
    expect(seedAvailable).toBe(target.stock - seedCommitted)

    expect(place(result, [request('p22', 1)]).errors.lines[0].productId).toMatch(/discontinued/)
    expect(place(result, [request(target.id, seedAvailable + 1)]).ok).toBe(false)
    expect(place(result, [request(target.id, seedAvailable)]).ok).toBe(true)
    expect(available(result, target.id)).toBe(0)
    expect(stockOf(result, target.id)).toBe(target.stock)
  })
})
