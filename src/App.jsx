import AppRouter from './router/AppRouter.jsx'
import { OrdersProvider } from './context/OrdersContext.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'

function App() {
  return (
    <ProductsProvider>
      <OrdersProvider>
        <AppRouter />
      </OrdersProvider>
    </ProductsProvider>
  )
}

export default App
