import { useCallback, useMemo, useState } from 'react'
import { ORDERS as INITIAL_ORDERS } from '../data/orders.js'
import { OrdersContext } from './ordersContextInstance.js'
import { applyStatusChange, isValidTransition } from './orderStatus.js'

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(INITIAL_ORDERS)

  const updateOrderStatus = useCallback((orderId, nextStatus) => {
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order
        if (!isValidTransition(order.status, nextStatus)) return order
        return applyStatusChange(order, nextStatus, new Date())
      }),
    )
  }, [])

  const value = useMemo(() => ({ orders, updateOrderStatus }), [orders, updateOrderStatus])

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}
