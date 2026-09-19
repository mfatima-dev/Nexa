import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { OrdersProvider } from './OrdersContext.jsx'
import { useOrders } from './useOrders.js'

function wrapper({ children }) {
  return <OrdersProvider>{children}</OrdersProvider>
}

describe('OrdersProvider + useOrders', () => {
  it('exposes the seeded orders on mount', () => {
    const { result } = renderHook(() => useOrders(), { wrapper })
    expect(result.current.orders.length).toBeGreaterThan(0)
  })

  it('throws when used outside a provider', () => {
    expect(() => renderHook(() => useOrders())).toThrow(/useOrders must be used within an OrdersProvider/)
  })

  it('advances a pending order to processing and stamps processingAt', () => {
    const { result } = renderHook(() => useOrders(), { wrapper })
    const target = result.current.orders.find((o) => o.status === 'Pending')
    expect(target).toBeDefined()

    act(() => result.current.updateOrderStatus(target.id, 'Processing'))

    const updated = result.current.orders.find((o) => o.id === target.id)
    expect(updated.status).toBe('Processing')
    expect(updated.processingAt).not.toBeNull()
  })

  it('ignores an invalid backwards transition', () => {
    const { result } = renderHook(() => useOrders(), { wrapper })
    const target = result.current.orders.find((o) => o.status === 'Delivered')
    expect(target).toBeDefined()

    act(() => result.current.updateOrderStatus(target.id, 'Pending'))

    const unchanged = result.current.orders.find((o) => o.id === target.id)
    expect(unchanged.status).toBe('Delivered')
  })

  it('ignores cancelling an order that has already shipped', () => {
    const { result } = renderHook(() => useOrders(), { wrapper })
    const target = result.current.orders.find((o) => o.status === 'Shipped')
    expect(target).toBeDefined()

    act(() => result.current.updateOrderStatus(target.id, 'Cancelled'))

    const unchanged = result.current.orders.find((o) => o.id === target.id)
    expect(unchanged.status).toBe('Shipped')
  })

  it('cancels a pending order and stamps cancelledAt', () => {
    const { result } = renderHook(() => useOrders(), { wrapper })
    const target = result.current.orders.find((o) => o.status === 'Pending')
    expect(target).toBeDefined()

    act(() => result.current.updateOrderStatus(target.id, 'Cancelled'))

    const updated = result.current.orders.find((o) => o.id === target.id)
    expect(updated.status).toBe('Cancelled')
    expect(updated.cancelledAt).not.toBeNull()
  })

  it('only updates the targeted order, leaving the rest untouched', () => {
    const { result } = renderHook(() => useOrders(), { wrapper })
    const before = result.current.orders
    const target = before.find((o) => o.status === 'Pending')

    act(() => result.current.updateOrderStatus(target.id, 'Processing'))

    const after = result.current.orders
    const otherBefore = before.filter((o) => o.id !== target.id)
    const otherAfter = after.filter((o) => o.id !== target.id)
    expect(otherAfter).toEqual(otherBefore)
  })
})

describe('OrdersProvider onOrderShipped', () => {
  function setupWithCallback(onOrderShipped) {
    return renderHook(() => useOrders(), {
      wrapper: ({ children }) => <OrdersProvider onOrderShipped={onOrderShipped}>{children}</OrdersProvider>,
    })
  }

  it('is called once, with the updated order, when an order moves to Shipped', () => {
    const calls = []
    const { result } = setupWithCallback((order) => calls.push(order))
    const target = result.current.orders.find((o) => o.status === 'Processing')

    act(() => result.current.updateOrderStatus(target.id, 'Shipped'))

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ id: target.id, status: 'Shipped' })
    expect(calls[0].shippedAt).not.toBeNull()
    // The order in shared state is the same one the callback received.
    expect(result.current.orders.find((o) => o.id === target.id)).toEqual(calls[0])
  })

  it('is not called for any other transition, or for an invalid one', () => {
    const calls = []
    const { result } = setupWithCallback((order) => calls.push(order))
    const pending = result.current.orders.find((o) => o.status === 'Pending')
    const delivered = result.current.orders.find((o) => o.status === 'Delivered')

    act(() => result.current.updateOrderStatus(pending.id, 'Processing'))
    act(() => result.current.updateOrderStatus(pending.id, 'Cancelled'))
    act(() => result.current.updateOrderStatus(delivered.id, 'Shipped')) // backwards: rejected
    act(() => result.current.updateOrderStatus('NX-99999', 'Shipped')) // unknown

    expect(calls).toHaveLength(0)
  })

  it('works without a callback', () => {
    const { result } = setupWithCallback(undefined)
    const target = result.current.orders.find((o) => o.status === 'Processing')
    act(() => result.current.updateOrderStatus(target.id, 'Shipped'))
    expect(result.current.orders.find((o) => o.id === target.id).status).toBe('Shipped')
  })
})
