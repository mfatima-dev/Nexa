import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { ProductsProvider } from './ProductsContext.jsx'
import { useProducts } from './useProducts.js'

const START = [
  { id: 'p01', name: 'Urban Backpack', sku: 'NX-BAG-01', category: 'Bags', price: 89, cost: 38, stock: 10, lowStockThreshold: 5, status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'p02', name: 'Travel Organizer', sku: 'NX-TRA-02', category: 'Travel', price: 34, cost: 14, stock: 20, lowStockThreshold: 5, status: 'active', createdAt: '2026-01-02T00:00:00.000Z' },
]

const NEW_VALUES = {
  name: 'Field Satchel',
  sku: 'nx-bag-03',
  category: 'Bags',
  price: '80',
  cost: '30',
  stock: '25',
  lowStockThreshold: '10',
  status: 'active',
}

function setup(initialProducts = START) {
  return renderHook(() => useProducts(), {
    wrapper: ({ children }) => <ProductsProvider initialProducts={initialProducts}>{children}</ProductsProvider>,
  })
}

describe('ProductsProvider', () => {
  it('starts from the seeded catalog by default', () => {
    const { result } = renderHook(() => useProducts(), { wrapper: ProductsProvider })
    expect(result.current.products.length).toBeGreaterThan(0)
  })

  it('throws outside a provider', () => {
    expect(() => renderHook(() => useProducts())).toThrow(/within a ProductsProvider/)
  })

  it('adds a validated product with a fresh id, normalised fields and a timestamp', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.addProduct(NEW_VALUES)
    })

    expect(outcome.ok).toBe(true)
    expect(outcome.product).toMatchObject({ id: 'p03', name: 'Field Satchel', sku: 'NX-BAG-03', price: 80, stock: 25 })
    expect(new Date(outcome.product.createdAt).getTime()).not.toBeNaN()
    expect(result.current.products).toHaveLength(3)
  })

  it('rejects invalid input without changing the catalog', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.addProduct({ ...NEW_VALUES, name: 'urban backpack', price: '-1' })
    })

    expect(outcome.ok).toBe(false)
    expect(Object.keys(outcome.errors).sort()).toEqual(['name', 'price'])
    expect(result.current.products).toHaveLength(2)
  })

  it('updates only the targeted product and keeps its id and creation date', () => {
    const { result } = setup()
    act(() => {
      result.current.updateProduct('p01', { ...NEW_VALUES, name: 'Urban Backpack 2', sku: 'NX-BAG-01' })
    })

    const [updated, untouched] = result.current.products
    expect(updated).toMatchObject({ id: 'p01', name: 'Urban Backpack 2', price: 80, createdAt: '2026-01-01T00:00:00.000Z' })
    expect(untouched).toEqual(START[1])
  })

  it('rejects an update that collides with another product, but allows keeping its own name', () => {
    const { result } = setup()
    let clash
    let same
    act(() => {
      clash = result.current.updateProduct('p01', { ...NEW_VALUES, name: 'Travel Organizer', sku: 'NX-BAG-01' })
    })
    act(() => {
      same = result.current.updateProduct('p01', { ...NEW_VALUES, name: 'Urban Backpack', sku: 'NX-BAG-01' })
    })

    expect(clash.ok).toBe(false)
    expect(clash.errors.name).toBeDefined()
    expect(same.ok).toBe(true)
  })

  it('fails cleanly when updating a product that does not exist', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.updateProduct('p99', NEW_VALUES)
    })
    expect(outcome.ok).toBe(false)
  })

  it('deletes a product', () => {
    const { result } = setup()
    let removed
    let missing
    act(() => {
      removed = result.current.deleteProduct('p01')
    })
    act(() => {
      missing = result.current.deleteProduct('p01')
    })

    expect(removed).toBe(true)
    expect(missing).toBe(false)
    expect(result.current.products.map((p) => p.id)).toEqual(['p02'])
  })

  it('does not reuse the id of a deleted product', () => {
    const { result } = setup()
    let first
    let second
    act(() => {
      first = result.current.addProduct(NEW_VALUES)
    })
    act(() => {
      result.current.deleteProduct(first.product.id)
    })
    act(() => {
      second = result.current.addProduct({ ...NEW_VALUES, name: 'Another', sku: 'NX-BAG-99' })
    })

    expect(first.product.id).toBe('p03')
    // p03 was issued once and must stay retired, even though nothing with that id remains.
    expect(second.product.id).toBe('p04')
    expect(result.current.products.map((p) => p.id)).toEqual(['p01', 'p02', 'p04'])
  })
})
