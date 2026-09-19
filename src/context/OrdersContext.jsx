import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ORDERS as INITIAL_ORDERS } from '../data/orders.js'
import { validateOrderRequest } from '../data/availability.js'
import { OrdersContext } from './ordersContextInstance.js'
import { applyStatusChange, isValidTransition } from './orderStatus.js'

const NO_PRODUCTS = () => []

// Order ids look like NX-1149. Orders are never deleted, so one more than the highest is always unused.
function nextOrderId(orders) {
  const highest = orders.reduce((max, order) => {
    const match = /^NX-(\d+)$/.exec(order.id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 999)
  return `NX-${highest + 1}`
}

/**
 * `onOrderShipped(order)` is called once, after state is updated, when an order moves to Shipped.
 * It is how order fulfillment reaches inventory without the two providers knowing about each other.
 *
 * `placeOrder({ customerId, items })` creates a Pending order. Placing an order reserves its units (the
 * commitment is derived from open orders, see data/availability.js) but never touches physical stock.
 * The request is validated against the freshest orders and products, `getProducts()` being injected the
 * same way as `onOrderShipped`, and it is all-or-nothing. Returns { ok, errors? , order? }.
 * `getOrders()` reads the freshest orders for whoever needs them outside React state.
 */
export function OrdersProvider({ children, onOrderShipped, getProducts = NO_PRODUCTS }) {
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const ordersRef = useRef(orders)
  const onOrderShippedRef = useRef(onOrderShipped)
  const getProductsRef = useRef(getProducts)

  useEffect(() => {
    onOrderShippedRef.current = onOrderShipped
    getProductsRef.current = getProducts
  })

  const getOrders = useCallback(() => ordersRef.current, [])

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

  const placeOrder = useCallback(({ customerId, items } = {}) => {
    const products = getProductsRef.current()
    const errors = validateOrderRequest(items, products, ordersRef.current)
    if (typeof customerId !== 'string' || !customerId.trim()) errors.customerId = 'Choose a customer.'
    if (Object.keys(errors).length > 0) return { ok: false, errors }

    // Name and unit price are snapshots, so the order stays readable and priced if the product changes.
    const lines = items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId)
      return { productId: product.id, productName: product.name, quantity: Number(item.quantity), unitPrice: product.price }
    })
    const order = {
      id: nextOrderId(ordersRef.current),
      customerId: customerId.trim(),
      status: 'Pending',
      placedAt: new Date().toISOString(),
      shippedAt: null,
      deliveredAt: null,
      items: lines,
      total: Number(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0).toFixed(2)),
    }

    const next = [...ordersRef.current, order]
    ordersRef.current = next
    setOrders(next)
    return { ok: true, order }
  }, [])

  const value = useMemo(
    () => ({ orders, updateOrderStatus, placeOrder, getOrders }),
    [orders, updateOrderStatus, placeOrder, getOrders],
  )

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}
