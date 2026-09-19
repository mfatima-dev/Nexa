import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ORDERS as INITIAL_ORDERS } from '../data/orders.js'
import { OrdersContext } from './ordersContextInstance.js'
import { applyStatusChange, isValidTransition } from './orderStatus.js'

/**
 * `onOrderShipped(order)` is called once, after state is updated, when an order moves to Shipped.
 * It is how order fulfillment reaches inventory without the two providers knowing about each other.
 */
export function OrdersProvider({ children, onOrderShipped }) {
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const ordersRef = useRef(orders)
  const onOrderShippedRef = useRef(onOrderShipped)

  useEffect(() => {
    onOrderShippedRef.current = onOrderShipped
  })

  const updateOrderStatus = useCallback((orderId, nextStatus) => {
    const order = ordersRef.current.find((candidate) => candidate.id === orderId)
    if (!order || !isValidTransition(order.status, nextStatus)) return

    const updated = applyStatusChange(order, nextStatus, new Date())
    const next = ordersRef.current.map((candidate) => (candidate.id === orderId ? updated : candidate))
    ordersRef.current = next
    setOrders(next)

    // Outside any state updater, so the side effect runs exactly once.
    if (nextStatus === 'Shipped') onOrderShippedRef.current?.(updated)
  }, [])

  const value = useMemo(() => ({ orders, updateOrderStatus }), [orders, updateOrderStatus])

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}
