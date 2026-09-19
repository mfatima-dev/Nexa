import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PRODUCTS } from '../data/products.js'
import { getStockReductionError } from '../data/availability.js'
import { SEED_INVENTORY_MOVEMENTS } from '../data/inventoryMovements.js'
import { validateAdjustment, validateRestock } from '../data/inventoryRules.js'
import {
  generateProductId,
  highestProductNumber,
  normalizeProductValues,
  validateProduct,
} from '../data/productRules.js'
import { ProductsContext } from './productsContextInstance.js'

/**
 * Single source of truth for the catalog AND its stock. `product.stock` is the on-hand count;
 * `movements` is the ledger explaining it. Every way stock can change goes through this provider
 * and appends a movement, so the ledger always reconciles with the on-hand numbers:
 *   addProduct (opening stock) / updateProduct (stock edited) / restockProduct / adjustProductStock
 *   / fulfillOrder (an order shipped).
 * Actions re-validate, so invalid data can never enter shared state, and return
 * { ok, errors?, product?, movement? } for the calling form.
 * Stock can't be manually reduced below the units committed to open orders, so this provider needs to
 * read the orders. It doesn't know the orders provider: `getOrders()` is injected (see BusinessProviders),
 * the same way the orders provider is handed `onOrderShipped`. `getProducts()` hands the freshest products
 * to the orders provider, which validates a new order against them.
 * `initialProducts` / `initialMovements` exist so tests can start from a known state.
 */
const NO_ORDERS = () => []

export function ProductsProvider({
  children,
  initialProducts = PRODUCTS,
  initialMovements = SEED_INVENTORY_MOVEMENTS,
  getOrders = NO_ORDERS,
}) {
  const [products, setProducts] = useState(initialProducts)
  const [movements, setMovements] = useState(initialMovements)
  const productsRef = useRef(products)
  const movementsRef = useRef(movements)
  const getOrdersRef = useRef(getOrders)

  useEffect(() => {
    getOrdersRef.current = getOrders
  })
  // Never decreases, so deleting a product can't free its id for reuse (orders still reference it).
  const highestIdRef = useRef(highestProductNumber(initialProducts))
  const movementCounterRef = useRef(0)

  const getProducts = useCallback(() => productsRef.current, [])

  const commit = useCallback((nextProducts, nextMovements = movementsRef.current) => {
    productsRef.current = nextProducts
    movementsRef.current = nextMovements
    setProducts(nextProducts)
    setMovements(nextMovements)
  }, [])

  const newMovement = useCallback((fields) => {
    movementCounterRef.current += 1
    return {
      id: `mv-s${movementCounterRef.current}`,
      note: '',
      orderId: null,
      occurredAt: new Date().toISOString(),
      ...fields,
    }
  }, [])

  const addProduct = useCallback(
    (values) => {
      const errors = validateProduct(values, productsRef.current)
      if (Object.keys(errors).length > 0) return { ok: false, errors }

      const id = generateProductId(productsRef.current, highestIdRef.current)
      highestIdRef.current = Number(id.slice(1))
      const product = { ...normalizeProductValues(values), id, createdAt: new Date().toISOString() }
      const opening = product.stock > 0
        ? [newMovement({ productId: id, reason: 'adjustment', change: product.stock, detail: 'Opening stock' })]
        : []
      commit([...productsRef.current, product], [...movementsRef.current, ...opening])
      return { ok: true, product }
    },
    [commit, newMovement],
  )

  const updateProduct = useCallback(
    (productId, values) => {
      const existing = productsRef.current.find((product) => product.id === productId)
      if (!existing) return { ok: false, errors: {} }

      const errors = validateProduct(values, productsRef.current, productId)
      if (Object.keys(errors).length > 0) return { ok: false, errors }

      const product = { ...existing, ...normalizeProductValues(values) }
      const floorError = getStockReductionError(productId, existing.stock, product.stock, getOrdersRef.current())
      if (floorError) return { ok: false, errors: { stock: floorError } }

      // Editing the stock field is a stock change like any other, so it goes in the ledger.
      const change = product.stock - existing.stock
      const logged =
        change !== 0
          ? [newMovement({ productId, reason: 'adjustment', change, detail: 'Edited on Products page' })]
          : []
      commit(
        productsRef.current.map((item) => (item.id === productId ? product : item)),
        [...movementsRef.current, ...logged],
      )
      return { ok: true, product }
    },
    [commit, newMovement],
  )

  const deleteProduct = useCallback(
    (productId) => {
      if (!productsRef.current.some((product) => product.id === productId)) return false
      commit(productsRef.current.filter((product) => product.id !== productId))
      return true
    },
    [commit],
  )

  const restockProduct = useCallback(
    (productId, values) => {
      const existing = productsRef.current.find((product) => product.id === productId)
      if (!existing) return { ok: false, errors: {} }

      const errors = validateRestock(values, existing.stock)
      if (Object.keys(errors).length > 0) return { ok: false, errors }

      const quantity = Number(values.quantity)
      const movement = newMovement({
        productId,
        reason: 'restock',
        change: quantity,
        detail: 'Stock received',
        note: String(values.note ?? '').trim(),
      })
      const product = { ...existing, stock: existing.stock + quantity }
      commit(
        productsRef.current.map((item) => (item.id === productId ? product : item)),
        [...movementsRef.current, movement],
      )
      return { ok: true, product, movement }
    },
    [commit, newMovement],
  )

  const adjustProductStock = useCallback(
    (productId, values) => {
      const existing = productsRef.current.find((product) => product.id === productId)
      if (!existing) return { ok: false, errors: {} }

      const errors = validateAdjustment(values, existing.stock)
      if (Object.keys(errors).length > 0) return { ok: false, errors }

      const newQuantity = Number(values.newQuantity)
      const floorError = getStockReductionError(productId, existing.stock, newQuantity, getOrdersRef.current())
      if (floorError) return { ok: false, errors: { newQuantity: floorError } }

      const movement = newMovement({
        productId,
        reason: 'adjustment',
        change: newQuantity - existing.stock,
        detail: values.reason,
        note: String(values.note ?? '').trim(),
      })
      const product = { ...existing, stock: newQuantity }
      commit(
        productsRef.current.map((item) => (item.id === productId ? product : item)),
        [...movementsRef.current, movement],
      )
      return { ok: true, product, movement }
    },
    [commit, newMovement],
  )

  /**
   * Called when an order ships: deducts each line from stock and records it. Stock never goes
   * below zero; if a line can't be fully covered, only what's on hand is deducted and the
   * shortfall is noted on the movement, so the ledger still reconciles. Lines for products
   * that no longer exist are skipped.
   */
  const fulfillOrder = useCallback(
    (order) => {
      let nextProducts = productsRef.current
      const added = []

      order.items.forEach((item) => {
        const product = nextProducts.find((candidate) => candidate.id === item.productId)
        if (!product) return

        const applied = Math.min(item.quantity, Math.max(product.stock, 0))
        const shortfall = item.quantity - applied
        nextProducts = nextProducts.map((candidate) =>
          candidate.id === product.id ? { ...candidate, stock: candidate.stock - applied } : candidate,
        )
        added.push(
          newMovement({
            productId: product.id,
            reason: 'fulfillment',
            change: -applied,
            detail: 'Order shipped',
            orderId: order.id,
            note: shortfall > 0 ? `Short by ${shortfall} ${shortfall === 1 ? 'unit' : 'units'}` : '',
          }),
        )
      })

      if (added.length > 0) commit(nextProducts, [...movementsRef.current, ...added])
    },
    [commit, newMovement],
  )

  const value = useMemo(
    () => ({
      products,
      movements,
      getProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      restockProduct,
      adjustProductStock,
      fulfillOrder,
    }),
    [
      products,
      movements,
      getProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      restockProduct,
      adjustProductStock,
      fulfillOrder,
    ],
  )

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}
