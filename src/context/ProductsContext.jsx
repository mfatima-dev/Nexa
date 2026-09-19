import { useCallback, useMemo, useRef, useState } from 'react'
import { PRODUCTS } from '../data/products.js'
import {
  generateProductId,
  highestProductNumber,
  normalizeProductValues,
  validateProduct,
} from '../data/productRules.js'
import { ProductsContext } from './productsContextInstance.js'

/**
 * Single source of truth for the product catalog. Actions re-validate, so invalid data can
 * never enter shared state. They return { ok, errors?, product? } for the calling form.
 * `initialProducts` exists so tests can start from a known catalog.
 */
export function ProductsProvider({ children, initialProducts = PRODUCTS }) {
  const [products, setProducts] = useState(initialProducts)
  const productsRef = useRef(products)
  // Never decreases, so deleting a product can't free its id for reuse (orders still reference it).
  const highestIdRef = useRef(highestProductNumber(initialProducts))

  const commit = useCallback((next) => {
    productsRef.current = next
    setProducts(next)
  }, [])

  const addProduct = useCallback(
    (values) => {
      const errors = validateProduct(values, productsRef.current)
      if (Object.keys(errors).length > 0) return { ok: false, errors }

      const id = generateProductId(productsRef.current, highestIdRef.current)
      highestIdRef.current = Number(id.slice(1))
      const product = { ...normalizeProductValues(values), id, createdAt: new Date().toISOString() }
      commit([...productsRef.current, product])
      return { ok: true, product }
    },
    [commit],
  )

  const updateProduct = useCallback(
    (productId, values) => {
      const existing = productsRef.current.find((product) => product.id === productId)
      if (!existing) return { ok: false, errors: {} }

      const errors = validateProduct(values, productsRef.current, productId)
      if (Object.keys(errors).length > 0) return { ok: false, errors }

      const product = { ...existing, ...normalizeProductValues(values) }
      commit(productsRef.current.map((item) => (item.id === productId ? product : item)))
      return { ok: true, product }
    },
    [commit],
  )

  const deleteProduct = useCallback(
    (productId) => {
      if (!productsRef.current.some((product) => product.id === productId)) return false
      commit(productsRef.current.filter((product) => product.id !== productId))
      return true
    },
    [commit],
  )

  const value = useMemo(
    () => ({ products, addProduct, updateProduct, deleteProduct }),
    [products, addProduct, updateProduct, deleteProduct],
  )

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}
