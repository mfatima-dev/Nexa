import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { getProductMovements } from '../data/inventorySelectors.js'
import { ProductsProvider } from './ProductsContext.jsx'
import { useProducts } from './useProducts.js'

const START = [
  { id: 'p01', name: 'Urban Backpack', sku: 'NX-BAG-01', category: 'Bags', price: 89, cost: 38, stock: 10, lowStockThreshold: 5, status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'p02', name: 'Travel Organizer', sku: 'NX-TRA-02', category: 'Travel', price: 34, cost: 14, stock: 20, lowStockThreshold: 5, status: 'active', createdAt: '2026-01-02T00:00:00.000Z' },
]

function setup(initialProducts = START, initialMovements = []) {
  return renderHook(() => useProducts(), {
    wrapper: ({ children }) => (
      <ProductsProvider initialProducts={initialProducts} initialMovements={initialMovements}>
        {children}
      </ProductsProvider>
    ),
  })
}

const stockOf = (result, id) => result.current.products.find((p) => p.id === id).stock
const line = (productId, quantity) => ({ productId, productName: productId, quantity, unitPrice: 1 })

describe('restockProduct', () => {
  it('adds the units to stock and records a restock movement', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.restockProduct('p01', { quantity: '25', note: '  PO-1042  ' })
    })

    expect(outcome.ok).toBe(true)
    expect(stockOf(result, 'p01')).toBe(35)
    expect(result.current.movements).toHaveLength(1)
    expect(result.current.movements[0]).toMatchObject({
      productId: 'p01',
      reason: 'restock',
      change: 25,
      detail: 'Stock received',
      note: 'PO-1042',
      orderId: null,
    })
    expect(new Date(result.current.movements[0].occurredAt).getTime()).not.toBeNaN()
  })

  it('leaves everything unchanged when the input is invalid', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.restockProduct('p01', { quantity: '0' })
    })

    expect(outcome.ok).toBe(false)
    expect(outcome.errors.quantity).toBeDefined()
    expect(stockOf(result, 'p01')).toBe(10)
    expect(result.current.movements).toHaveLength(0)
  })

  it('fails cleanly for an unknown product', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.restockProduct('nope', { quantity: '5' })
    })
    expect(outcome.ok).toBe(false)
    expect(result.current.movements).toHaveLength(0)
  })
})

describe('adjustProductStock', () => {
  it('sets the new count and records the signed difference with its reason', () => {
    const { result } = setup()
    act(() => {
      result.current.adjustProductStock('p01', { newQuantity: '7', reason: 'Damaged or lost', note: 'Water damage' })
    })

    expect(stockOf(result, 'p01')).toBe(7)
    expect(result.current.movements[0]).toMatchObject({
      reason: 'adjustment',
      change: -3,
      detail: 'Damaged or lost',
      note: 'Water damage',
    })
  })

  it('can adjust upward, e.g. a customer return', () => {
    const { result } = setup()
    act(() => {
      result.current.adjustProductStock('p02', { newQuantity: '23', reason: 'Returned by customer' })
    })
    expect(stockOf(result, 'p02')).toBe(23)
    expect(result.current.movements[0].change).toBe(3)
  })

  it('rejects an unchanged count and an "Other" reason without a note', () => {
    const { result } = setup()
    let same
    let other
    act(() => {
      same = result.current.adjustProductStock('p01', { newQuantity: '10', reason: 'Stock count correction' })
    })
    act(() => {
      other = result.current.adjustProductStock('p01', { newQuantity: '9', reason: 'Other', note: '' })
    })

    expect(same.errors.newQuantity).toBeDefined()
    expect(other.errors.note).toBeDefined()
    expect(stockOf(result, 'p01')).toBe(10)
    expect(result.current.movements).toHaveLength(0)
  })
})

describe('stock changes made from the Products page are recorded too', () => {
  const values = (overrides) => ({
    name: 'Urban Backpack',
    sku: 'NX-BAG-01',
    category: 'Bags',
    price: '89',
    cost: '38',
    stock: '10',
    lowStockThreshold: '5',
    status: 'active',
    ...overrides,
  })

  it('logs an adjustment when an edit changes stock, but nothing when it does not', () => {
    const { result } = setup()
    act(() => {
      result.current.updateProduct('p01', values({ name: 'Urban Backpack v2' }))
    })
    expect(result.current.movements).toHaveLength(0)

    act(() => {
      result.current.updateProduct('p01', values({ name: 'Urban Backpack v2', stock: '4' }))
    })
    expect(stockOf(result, 'p01')).toBe(4)
    expect(result.current.movements).toHaveLength(1)
    expect(result.current.movements[0]).toMatchObject({ reason: 'adjustment', change: -6, detail: 'Edited on Products page' })
  })

  it('logs opening stock for a new product that starts with units', () => {
    const { result } = setup()
    let added
    act(() => {
      added = result.current.addProduct(values({ name: 'Field Satchel', sku: 'NX-BAG-03', stock: '30' }))
    })
    expect(result.current.movements).toEqual([expect.objectContaining({ productId: added.product.id, change: 30, detail: 'Opening stock' })])

    act(() => {
      result.current.addProduct(values({ name: 'Empty Shelf Item', sku: 'NX-BAG-04', stock: '0' }))
    })
    expect(result.current.movements).toHaveLength(1)
  })
})

describe('fulfillOrder', () => {
  it('deducts every line from stock and records each against the order', () => {
    const { result } = setup()
    act(() => {
      result.current.fulfillOrder({ id: 'NX-2000', items: [line('p01', 3), line('p02', 5)] })
    })

    expect(stockOf(result, 'p01')).toBe(7)
    expect(stockOf(result, 'p02')).toBe(15)
    expect(result.current.movements).toHaveLength(2)
    expect(result.current.movements).toEqual([
      expect.objectContaining({ productId: 'p01', reason: 'fulfillment', change: -3, orderId: 'NX-2000', note: '' }),
      expect.objectContaining({ productId: 'p02', reason: 'fulfillment', change: -5, orderId: 'NX-2000' }),
    ])
  })

  it('never takes stock below zero: it deducts what is on hand and notes the shortfall', () => {
    const { result } = setup()
    act(() => {
      result.current.fulfillOrder({ id: 'NX-2001', items: [line('p01', 14)] })
    })

    expect(stockOf(result, 'p01')).toBe(0)
    expect(result.current.movements[0]).toMatchObject({ change: -10, note: 'Short by 4 units' })
  })

  it('skips lines for products that no longer exist', () => {
    const { result } = setup()
    act(() => {
      result.current.deleteProduct('p02')
    })
    act(() => {
      result.current.fulfillOrder({ id: 'NX-2002', items: [line('p02', 2), line('p01', 1)] })
    })

    expect(result.current.movements).toHaveLength(1)
    expect(result.current.movements[0].productId).toBe('p01')
  })

  it('does nothing when no line can be fulfilled', () => {
    const { result } = setup()
    act(() => {
      result.current.fulfillOrder({ id: 'NX-2003', items: [line('ghost', 2)] })
    })
    expect(result.current.movements).toHaveLength(0)
  })
})

describe('the ledger always reconciles with on-hand stock', () => {
  it('after a mix of every kind of change, walking the history back lands on the opening stock', () => {
    const { result } = setup()
    const opening = stockOf(result, 'p01')

    act(() => {
      result.current.restockProduct('p01', { quantity: '40' })
    })
    act(() => {
      result.current.fulfillOrder({ id: 'NX-1', items: [line('p01', 6)] })
    })
    act(() => {
      result.current.adjustProductStock('p01', { newQuantity: '30', reason: 'Stock count correction' })
    })
    act(() => {
      result.current.fulfillOrder({ id: 'NX-2', items: [line('p01', 50)] }) // more than is on hand
    })

    const product = result.current.products.find((p) => p.id === 'p01')
    const history = getProductMovements(result.current.movements, product)
    const netChange = history.reduce((sum, movement) => sum + movement.change, 0)

    expect(product.stock).toBe(0)
    expect(history[0].balanceAfter).toBe(product.stock)
    expect(product.stock - netChange).toBe(opening)
  })

  it('gives every movement a unique id and keeps history after a product is deleted', () => {
    const { result } = setup()
    act(() => {
      result.current.restockProduct('p01', { quantity: '5' })
    })
    act(() => {
      result.current.restockProduct('p01', { quantity: '5' })
    })
    act(() => {
      result.current.deleteProduct('p01')
    })

    const ids = result.current.movements.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(result.current.movements).toHaveLength(2)
  })
})
