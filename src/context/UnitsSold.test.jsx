import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { getProductStats } from '../data/selectors.js'
import { OrdersProvider } from './OrdersContext.jsx'
import { ProductsProvider } from './ProductsContext.jsx'
import { useOrders } from './useOrders.js'
import { useProducts } from './useProducts.js'

// The same wiring as App.jsx: shipping an order takes its units out of stock.
function OrdersWithFulfillment({ children }) {
  const { fulfillOrder } = useProducts()
  return <OrdersProvider onOrderShipped={fulfillOrder}>{children}</OrdersProvider>
}

function setup() {
  return renderHook(() => ({ ...useOrders(), ...useProducts() }), {
    wrapper: ({ children }) => (
      <ProductsProvider>
        <OrdersWithFulfillment>{children}</OrdersWithFulfillment>
      </ProductsProvider>
    ),
  })
}

// One reading of every line of an order: what Products/Inventory show as units sold, and the stock on hand.
function readLines(result, order) {
  const stats = getProductStats(result.current.products, result.current.orders)
  return order.items.map((item) => {
    const entry = stats.find((candidate) => candidate.product.id === item.productId)
    return { productId: item.productId, quantity: item.quantity, unitsSold: entry.unitsSold, stock: entry.product.stock }
  })
}

// An order of the given status whose lines can all be fulfilled from stock (so nothing is short).
function pickOrder(result, status) {
  const stockOf = (productId) => result.current.products.find((product) => product.id === productId)?.stock ?? 0
  return result.current.orders.find(
    (order) => order.status === status && order.items.every((item) => stockOf(item.productId) >= item.quantity),
  )
}

const move = (result, orderId, status) => act(() => result.current.updateOrderStatus(orderId, status))

describe('Units sold follow shipping, and move together with the stock deduction', () => {
  it('a Pending order is not sold, and moving it to Processing changes neither units sold nor stock', () => {
    const { result } = setup()
    const order = pickOrder(result, 'Pending')
    expect(order).toBeDefined()
    const before = readLines(result, order)

    move(result, order.id, 'Processing')

    expect(result.current.orders.find((candidate) => candidate.id === order.id).status).toBe('Processing')
    expect(readLines(result, order)).toEqual(before)
    expect(result.current.movements.some((movement) => movement.orderId === order.id)).toBe(false)
  })

  it('shipping a Processing order sells exactly its units and deducts exactly the same units from stock', () => {
    const { result } = setup()
    const order = pickOrder(result, 'Processing')
    expect(order).toBeDefined()
    const before = readLines(result, order)

    move(result, order.id, 'Shipped')

    const after = readLines(result, order)
    before.forEach((line, index) => {
      expect(after[index].unitsSold - line.unitsSold).toBe(line.quantity)
      expect(line.stock - after[index].stock).toBe(line.quantity)
    })
    const fulfilled = result.current.movements.filter((movement) => movement.orderId === order.id)
    expect(fulfilled).toHaveLength(order.items.length)
    fulfilled.forEach((movement) => expect(movement.reason).toBe('fulfillment'))
  })

  it('delivering a Shipped order changes nothing more: it is already sold, and stock is not deducted twice', () => {
    const { result } = setup()
    const order = result.current.orders.find((candidate) => candidate.status === 'Shipped')
    expect(order).toBeDefined()
    const before = readLines(result, order)
    const movementsBefore = result.current.movements.length

    move(result, order.id, 'Delivered')

    expect(result.current.orders.find((candidate) => candidate.id === order.id).status).toBe('Delivered')
    expect(readLines(result, order)).toEqual(before)
    expect(result.current.movements).toHaveLength(movementsBefore)
  })

  it.each(['Pending', 'Processing'])('cancelling a %s order never sells its units and never touches stock', (status) => {
    const { result } = setup()
    const order = pickOrder(result, status)
    expect(order).toBeDefined()
    const before = readLines(result, order)
    const movementsBefore = result.current.movements.length

    move(result, order.id, 'Cancelled')

    expect(result.current.orders.find((candidate) => candidate.id === order.id).status).toBe('Cancelled')
    expect(readLines(result, order)).toEqual(before)
    expect(result.current.movements).toHaveLength(movementsBefore)
  })

  it('takes one order all the way through: nothing sold until Shipped, then sold once', () => {
    const { result } = setup()
    const order = pickOrder(result, 'Pending')
    const start = readLines(result, order)
    const sold = () => readLines(result, order).map((line, index) => line.unitsSold - start[index].unitsSold)
    const quantities = order.items.map((item) => item.quantity)

    move(result, order.id, 'Processing')
    expect(sold()).toEqual(quantities.map(() => 0))
    move(result, order.id, 'Shipped')
    expect(sold()).toEqual(quantities)
    move(result, order.id, 'Delivered')
    expect(sold()).toEqual(quantities)
  })
})
