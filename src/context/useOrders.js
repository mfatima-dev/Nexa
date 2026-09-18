import { useContext } from 'react'
import { OrdersContext } from './ordersContextInstance.js'

export function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider')
  }
  return context
}
