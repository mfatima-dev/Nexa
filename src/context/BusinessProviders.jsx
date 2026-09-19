import { useCallback, useEffect, useRef } from 'react'
import { OrdersProvider } from './OrdersContext.jsx'
import { ProductsProvider } from './ProductsContext.jsx'
import { useOrders } from './useOrders.js'
import { useProducts } from './useProducts.js'

// Stock and orders each need the other's freshest state, but neither provider knows the other:
//  - shipping an order takes its units out of stock (`onOrderShipped`), and placing an order checks what
//    the products have available (`getProducts`), both handed to the orders provider from here;
//  - stock can't be reduced below what open orders have committed, so the products provider is handed
//    `getOrders`. The products provider sits outside the orders provider, so it reads them through a ref
//    that OrdersReader fills in once the orders provider is mounted.
function OrdersReader({ readerRef, children }) {
  const { getOrders } = useOrders()
  useEffect(() => {
    readerRef.current = getOrders
  }, [getOrders, readerRef])
  return children
}

function OrdersWithFulfillment({ readerRef, children }) {
  const { fulfillOrder, getProducts } = useProducts()
  return (
    <OrdersProvider onOrderShipped={fulfillOrder} getProducts={getProducts}>
      <OrdersReader readerRef={readerRef}>{children}</OrdersReader>
    </OrdersProvider>
  )
}

/** The products and orders providers, wired together. `initialProducts` / `initialMovements` are for tests. */
export function BusinessProviders({ children, initialProducts, initialMovements }) {
  const ordersReaderRef = useRef(() => [])
  const getOrders = useCallback(() => ordersReaderRef.current(), [])

  return (
    <ProductsProvider initialProducts={initialProducts} initialMovements={initialMovements} getOrders={getOrders}>
      <OrdersWithFulfillment readerRef={ordersReaderRef}>{children}</OrdersWithFulfillment>
    </ProductsProvider>
  )
}
