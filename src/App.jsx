import AppRouter from './router/AppRouter.jsx'
import { OrdersProvider } from './context/OrdersContext.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'
import { useProducts } from './context/useProducts.js'

// Shipping an order takes its units out of stock. The bridge lives here so that neither provider
// needs to know about the other.
function OrdersWithFulfillment({ children }) {
  const { fulfillOrder } = useProducts()
  return <OrdersProvider onOrderShipped={fulfillOrder}>{children}</OrdersProvider>
}

function App() {
  return (
    <ProductsProvider>
      <OrdersWithFulfillment>
        <AppRouter />
      </OrdersWithFulfillment>
    </ProductsProvider>
  )
}

export default App
