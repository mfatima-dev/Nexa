import { useCallback, useMemo, useRef, useState } from 'react'
import { getAvailableUnits } from '../data/availability.js'
import { useOrders } from './useOrders.js'
import { useProducts } from './useProducts.js'
import { CartContext } from './cartContextInstance.js'

function roundCurrency(value) {
  return Number(value.toFixed(2))
}

/**
 * The Storefront's shopping cart. It exists only for the current browser session — Nexa has no
 * persistence yet, so the cart is lost on reload, same as everything a customer does before checkout.
 * Nothing here is reserved: reservation happens only when OrdersContext.placeOrder creates the order
 * at checkout, so `getAvailableUnits` (the one authority for what can still be sold, shared with the
 * admin Inventory floor) is what decides how much of a product the cart will accept — and only for a
 * product that is still active; a discontinued product can never be added, whatever its stock reads.
 * Lines are kept as bare { productId, quantity } and resolved against the live product list on every
 * read, so price and availability in the cart are never stale. `linesRef` mirrors the lines state (the
 * same pattern ProductsContext/OrdersContext use for their own state) so two cart actions called back
 * to back in the same tick — e.g. two quick-adds before React re-renders — both see the real, current
 * cart instead of a stale one.
 */
export function CartProvider({ children }) {
  const { products } = useProducts()
  const { orders } = useOrders()
  const [lines, setLines] = useState([])
  const linesRef = useRef(lines)

  const commit = useCallback((next) => {
    linesRef.current = next
    setLines(next)
  }, [])

  const availableFor = useCallback(
    (productId) => {
      const product = products.find((candidate) => candidate.id === productId)
      if (!product || product.status !== 'active') return 0
      return getAvailableUnits(productId, products, orders)
    },
    [products, orders],
  )

  const setQuantity = useCallback(
    (productId, quantity) => {
      const available = availableFor(productId)
      const requested = Math.floor(Number(quantity) || 0)
      const clamped = Math.max(0, Math.min(requested, available))

      const current = linesRef.current
      if (clamped <= 0) {
        commit(current.filter((line) => line.productId !== productId))
      } else if (current.some((line) => line.productId === productId)) {
        commit(current.map((line) => (line.productId === productId ? { ...line, quantity: clamped } : line)))
      } else {
        commit([...current, { productId, quantity: clamped }])
      }

      return { ok: requested > 0 && clamped === requested, available, requested: Math.max(requested, 0) }
    },
    [availableFor, commit],
  )

  const addItem = useCallback(
    (productId, quantity = 1) => {
      const current = linesRef.current.find((line) => line.productId === productId)?.quantity ?? 0
      return setQuantity(productId, current + quantity)
    },
    [setQuantity],
  )

  const removeItem = useCallback(
    (productId) => {
      commit(linesRef.current.filter((line) => line.productId !== productId))
    },
    [commit],
  )

  const clear = useCallback(() => commit([]), [commit])

  // Resolved against the live catalog: a product that was deleted, or is no longer active, drops out
  // of the cart's display (and so out of the checkout request) without needing to be removed by hand.
  const items = useMemo(
    () =>
      lines
        .map((line) => {
          const product = products.find((candidate) => candidate.id === line.productId)
          if (!product || product.status !== 'active') return null
          return {
            product,
            quantity: line.quantity,
            available: availableFor(product.id),
            lineTotal: roundCurrency(product.price * line.quantity),
          }
        })
        .filter(Boolean),
    [lines, products, availableFor],
  )

  const subtotal = useMemo(() => roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0)), [items])
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  const value = useMemo(
    () => ({ items, subtotal, totalQuantity, addItem, setQuantity, removeItem, clear, availableFor }),
    [items, subtotal, totalQuantity, addItem, setQuantity, removeItem, clear, availableFor],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
