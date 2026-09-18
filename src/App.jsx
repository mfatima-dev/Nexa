import AppRouter from './router/AppRouter.jsx'
import { OrdersProvider } from './context/OrdersContext.jsx'

function App() {
  return (
    <OrdersProvider>
      <AppRouter />
    </OrdersProvider>
  )
}

export default App
