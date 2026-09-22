import { useContext } from 'react'
import { CustomersContext } from './customersContextInstance.js'

export function useCustomers() {
  const context = useContext(CustomersContext)
  if (!context) {
    throw new Error('useCustomers must be used within a CustomersProvider')
  }
  return context
}
