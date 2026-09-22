import { useCallback, useEffect, useRef } from 'react'
import { CustomersProvider } from './CustomersContext.jsx'
import { OrdersProvider } from './OrdersContext.jsx'
import { ProductsProvider } from './ProductsContext.jsx'
import { useCustomers } from './useCustomers.js'
import { useOrders } from './useOrders.js'
import { useProducts } from './useProducts.js'

// Stock, orders and customers each need one another's freshest state, but no provider knows another:
//  - shipping an order takes its units out of stock (`onOrderShipped`), and placing an order checks what
//    the products have available and who the customer is (`getProducts` / `getCustomers`), all three
//    handed to the orders provider from here;
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
  const { getCustomers } = useCustomers()
  return (
    <OrdersProvider onOrderShipped={fulfillOrder} getProducts={getProducts} getCustomers={getCustomers}>
      <OrdersReader readerRef={readerRef}>{children}</OrdersReader>
    </OrdersProvider>
  )
}

/**
 * The customers, products and orders providers, wired together.
 * `initialProducts` / `initialMovements` / `initialCustomers` are for tests.
 */
export function BusinessProviders({ children, initialProducts, initialMovements, initialCustomers }) {
  const ordersReaderRef = useRef(() => [])
  const getOrders = useCallback(() => ordersReaderRef.current(), [])

  return (
    <CustomersProvider initialCustomers={initialCustomers}>
      <ProductsProvider initialProducts={initialProducts} initialMovements={initialMovements} getOrders={getOrders}>
        <OrdersWithFulfillment readerRef={ordersReaderRef}>{children}</OrdersWithFulfillment>
      </ProductsProvider>
    </CustomersProvider>
  )
}
