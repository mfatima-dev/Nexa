import { describe, expect, it } from 'vitest'
import { canCancelOrder } from '../context/orderStatus.js'
import {
  getAvailableUnits,
  getCommittedUnits,
  getStockReductionError,
  isOpenOrder,
  validateOrderRequest,
} from './availability.js'

const product = (id, stock, status = 'active') => ({
  id,
  name: `Product ${id}`,
  sku: `NX-${id}`,
  category: 'Bags',
  price: 10,
  cost: 4,
  stock,
  lowStockThreshold: 2,
  status,
})
const order = (id, status, items) => ({ id, status, customerId: 'c001', placedAt: '2026-06-01T00:00:00.000Z', items, total: 0 })
const line = (productId, quantity) => ({ productId, productName: productId, quantity, unitPrice: 10 })
const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

describe('isOpenOrder', () => {
  it.each([
    ['Pending', true],
    ['Processing', true],
    ['Shipped', false],
    ['Delivered', false],
    ['Cancelled', false],
  ])('%s is open: %s', (status, open) => {
    expect(isOpenOrder({ status })).toBe(open)
  })

  it('is exactly the set of orders that can still be cancelled, so the two rules cannot drift apart', () => {
    STATUSES.forEach((status) => expect(isOpenOrder({ status })).toBe(canCancelOrder(status)))
  })
})

describe('getCommittedUnits', () => {
  it.each([
    ['Pending', 5],
    ['Processing', 5],
    ['Shipped', 0],
    ['Delivered', 0],
    ['Cancelled', 0],
  ])('a %s order of 5 units commits %i', (status, committed) => {
    expect(getCommittedUnits('a', [order('1', status, [line('a', 5)])])).toBe(committed)
  })

  it('adds up every open order and every line of the product, and ignores other products', () => {
    const orders = [
      order('1', 'Pending', [line('a', 2), line('b', 7)]),
      order('2', 'Processing', [line('a', 3)]),
      order('3', 'Shipped', [line('a', 100)]),
      order('4', 'Delivered', [line('a', 100)]),
      order('5', 'Cancelled', [line('a', 100)]),
    ]
    expect(getCommittedUnits('a', orders)).toBe(5)
    expect(getCommittedUnits('b', orders)).toBe(7)
    expect(getCommittedUnits('c', orders)).toBe(0)
    expect(getCommittedUnits('a', [])).toBe(0)
  })
})

describe('getAvailableUnits', () => {
  const products = [product('a', 10), product('b', 3)]

  it('is on-hand stock minus committed units', () => {
    const orders = [order('1', 'Pending', [line('a', 4)]), order('2', 'Processing', [line('a', 1)])]
    expect(getAvailableUnits('a', products, orders)).toBe(5)
  })

  it('is not reduced by shipped, delivered or cancelled orders', () => {
    const orders = ['Shipped', 'Delivered', 'Cancelled'].map((status, index) => order(String(index), status, [line('a', 4)]))
    expect(getAvailableUnits('a', products, orders)).toBe(10)
  })

  it('never goes below zero, even when more is committed than is on hand', () => {
    expect(getAvailableUnits('b', products, [order('1', 'Pending', [line('b', 5)])])).toBe(0)
  })

  it('is zero for a product that does not exist', () => {
    expect(getAvailableUnits('ghost', products, [])).toBe(0)
  })
})

describe('validateOrderRequest', () => {
  const products = [product('a', 10), product('b', 3), product('old', 8, 'discontinued')]
  const validate = (items, orders = []) => validateOrderRequest(items, products, orders)

  it('accepts a request whose every line is available (an empty errors object)', () => {
    expect(validate([{ productId: 'a', quantity: 2 }])).toEqual({})
    expect(validate([{ productId: 'a', quantity: 10 }, { productId: 'b', quantity: 3 }])).toEqual({}) // exactly what is available
  })

  it('accepts a numeric string quantity, like the rest of Nexa’s forms', () => {
    expect(validate([{ productId: 'a', quantity: '4' }])).toEqual({})
  })

  it('rejects a product that does not exist', () => {
    const errors = validate([{ productId: 'ghost', quantity: 1 }])
    expect(errors.lines[0].productId).toMatch(/isn’t available/)
  })

  it('rejects a discontinued product, even one with stock', () => {
    const errors = validate([{ productId: 'old', quantity: 1 }])
    expect(errors.lines[0].productId).toMatch(/discontinued/)
  })

  it.each([0, -1, -10])('rejects a quantity below 1 (%s)', (quantity) => {
    expect(validate([{ productId: 'a', quantity }]).lines[0].quantity).toMatch(/whole number, 1 or more/)
  })

  it.each([1.5, 0.5, '2.5', Infinity])('rejects a quantity that is not a whole number (%s)', (quantity) => {
    expect(validate([{ productId: 'a', quantity }]).lines[0].quantity).toMatch(/whole number/)
  })

  it.each([undefined, null, '', '  ', 'lots', NaN])('rejects a missing or unreadable quantity (%s)', (quantity) => {
    expect(validate([{ productId: 'a', quantity }]).lines[0].quantity).toBeDefined()
  })

  it('rejects more than what is available, and says how many are', () => {
    expect(validate([{ productId: 'a', quantity: 11 }]).lines[0].quantity).toBe('Only 10 available.')
  })

  it('counts units already committed to open orders as unavailable', () => {
    const orders = [order('1', 'Pending', [line('a', 6)]), order('2', 'Processing', [line('a', 2)])]
    expect(validate([{ productId: 'a', quantity: 2 }], orders)).toEqual({})
    expect(validate([{ productId: 'a', quantity: 3 }], orders).lines[0].quantity).toBe('Only 2 available.')
  })

  it('does not count shipped, delivered or cancelled orders against what is available', () => {
    const orders = ['Shipped', 'Delivered', 'Cancelled'].map((status, index) => order(String(index), status, [line('a', 10)]))
    expect(validate([{ productId: 'a', quantity: 10 }], orders)).toEqual({})
  })

  it('says a product is out of stock when nothing is left to promise', () => {
    const orders = [order('1', 'Pending', [line('b', 3)])]
    expect(validate([{ productId: 'b', quantity: 1 }], orders).lines[0].quantity).toBe('Out of stock.')
  })

  it('rejects the whole request when any line fails, and lines up the messages with the request', () => {
    const errors = validate([
      { productId: 'a', quantity: 1 },
      { productId: 'b', quantity: 4 },
      { productId: 'old', quantity: 1 },
    ])
    expect(errors.lines).toHaveLength(3)
    expect(errors.lines[0]).toBeNull()
    expect(errors.lines[1].quantity).toBe('Only 3 available.')
    expect(errors.lines[2].productId).toMatch(/discontinued/)
  })

  it('reports both a bad product and a bad quantity on the same line', () => {
    const errors = validate([{ productId: 'ghost', quantity: 0 }])
    expect(Object.keys(errors.lines[0]).sort()).toEqual(['productId', 'quantity'])
  })

  it('rejects an empty or missing request', () => {
    expect(validate([]).items).toBe('Add at least one item.')
    expect(validate(undefined).items).toBe('Add at least one item.')
    expect(validate('a').items).toBe('Add at least one item.')
  })

  it('rejects the same product twice, so its units can never be counted separately', () => {
    const errors = validate([{ productId: 'a', quantity: 6 }, { productId: 'a', quantity: 6 }])
    expect(errors.lines[0]).toBeNull()
    expect(errors.lines[1].productId).toMatch(/only be added once/)
  })

  it('rejects a line that is not an object', () => {
    expect(validate([null]).lines[0].productId).toBeDefined()
    expect(validate(['a']).lines[0].productId).toBeDefined()
  })
})

describe('getStockReductionError', () => {
  const open = [order('1', 'Pending', [line('a', 3)]), order('2', 'Processing', [line('a', 2)])] // 5 committed

  it('blocks a reduction below the committed units, and says how many are committed', () => {
    expect(getStockReductionError('a', 10, 4, open)).toBe('5 units are committed to open orders. On hand can’t go below 5.')
    expect(getStockReductionError('a', 10, 0, open)).toMatch(/committed to open orders/)
  })

  it('uses the singular for a single committed unit', () => {
    expect(getStockReductionError('a', 10, 0, [order('1', 'Pending', [line('a', 1)])])).toBe(
      '1 unit is committed to open orders. On hand can’t go below 1.',
    )
  })

  it('allows a reduction that stays at or above the committed units', () => {
    expect(getStockReductionError('a', 10, 5, open)).toBeNull()
    expect(getStockReductionError('a', 10, 9, open)).toBeNull()
  })

  it('allows any increase, and no change, whatever is committed', () => {
    expect(getStockReductionError('a', 10, 11, open)).toBeNull()
    expect(getStockReductionError('a', 10, 10, open)).toBeNull()
    expect(getStockReductionError('a', 3, 4, open)).toBeNull() // still short of the commitment, but going up
  })

  it('does not treat a product that is already short as an excuse to block unrelated edits', () => {
    expect(getStockReductionError('a', 3, 3, open)).toBeNull()
    expect(getStockReductionError('a', 3, 2, open)).toMatch(/committed/) // but taking it lower is blocked
  })

  it('ignores shipped, delivered and cancelled orders, and other products', () => {
    const closed = ['Shipped', 'Delivered', 'Cancelled'].map((status, index) => order(String(index), status, [line('a', 50)]))
    expect(getStockReductionError('a', 10, 0, closed)).toBeNull()
    expect(getStockReductionError('b', 10, 0, open)).toBeNull()
  })
})
