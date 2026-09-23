import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { CartProvider } from './CartContext.jsx'
import { useCart } from './useCart.js'
import { useOrders } from './useOrders.js'
import { useProducts } from './useProducts.js'
import { ProductsProvider } from './ProductsContext.jsx'
import { OrdersProvider } from './OrdersContext.jsx'

const catalogProduct = (fields) => ({
  category: 'Bags',
  cost: 20,
  lowStockThreshold: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
  ...fields,
})
const CATALOG = [
  catalogProduct({ id: 'sf1', name: 'Voyage Backpack', price: 120, stock: 10, sku: 'SF-BAG-1' }),
  catalogProduct({ id: 'sf2', name: 'Transit Duffel', price: 80, stock: 3, sku: 'SF-BAG-2' }),
  catalogProduct({ id: 'sf3', name: 'Retired Tote', price: 40, stock: 20, sku: 'SF-BAG-3', status: 'discontinued' }),
]

const STUB_CUSTOMERS = [{ id: 'c1', name: 'Test Customer', email: 't@example.com' }]

// The real providers, wired the same way the Storefront wires them (BusinessProviders plus CartProvider).
function setup(initialProducts = CATALOG) {
  return renderHook(() => ({ ...useCart(), ...useProducts(), ...useOrders() }), {
    wrapper: ({ children }) => (
      <ProductsProvider initialProducts={initialProducts} initialMovements={[]}>
        <OrdersProvider getProducts={() => initialProducts} getCustomers={() => STUB_CUSTOMERS}>
          <CartProvider>{children}</CartProvider>
        </OrdersProvider>
      </ProductsProvider>
    ),
  })
}

describe('CartProvider: adding, updating and removing', () => {
  it('adds a product, and reflects its live name, price and line total', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.addItem('sf1', 2)
    })

    expect(outcome).toEqual({ ok: true, available: 10, requested: 2 })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({ quantity: 2, lineTotal: 240 })
    expect(result.current.items[0].product.name).toBe('Voyage Backpack')
    expect(result.current.subtotal).toBe(240)
    expect(result.current.totalQuantity).toBe(2)
  })

  it('adding the same product again increases its line instead of creating a second one', () => {
    const { result } = setup()
    act(() => {
      result.current.addItem('sf1', 2)
      result.current.addItem('sf1', 3)
    })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(5)
  })

  it('setQuantity sets a line to an exact amount', () => {
    const { result } = setup()
    act(() => {
      result.current.addItem('sf1', 2)
      result.current.setQuantity('sf1', 7)
    })
    expect(result.current.items[0].quantity).toBe(7)
  })

  it('setting quantity to 0 removes the line, same as removeItem', () => {
    const { result } = setup()
    act(() => {
      result.current.addItem('sf1', 2)
      result.current.addItem('sf2', 1)
      result.current.setQuantity('sf1', 0)
    })
    expect(result.current.items.map((item) => item.product.id)).toEqual(['sf2'])

    act(() => {
      result.current.removeItem('sf2')
    })
    expect(result.current.items).toEqual([])
    expect(result.current.subtotal).toBe(0)
  })

  it('clear empties the whole cart', () => {
    const { result } = setup()
    act(() => {
      result.current.addItem('sf1', 1)
      result.current.addItem('sf2', 1)
      result.current.clear()
    })
    expect(result.current.items).toEqual([])
    expect(result.current.totalQuantity).toBe(0)
  })

  it('holds more than one product at once, each with its own line total', () => {
    const { result } = setup()
    act(() => {
      result.current.addItem('sf1', 1)
      result.current.addItem('sf2', 2)
    })
    expect(result.current.subtotal).toBe(120 + 80 * 2)
    expect(result.current.totalQuantity).toBe(3)
  })
})

describe('CartProvider: cannot exceed what is actually available', () => {
  it('clamps a request above the on-hand stock, and reports the real available count', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.addItem('sf2', 10) // only 3 in stock
    })
    expect(outcome).toEqual({ ok: false, available: 3, requested: 10 })
    expect(result.current.items[0].quantity).toBe(3)
  })

  it('setQuantity also clamps to what is available', () => {
    const { result } = setup()
    act(() => {
      result.current.setQuantity('sf2', 50)
    })
    expect(result.current.items[0].quantity).toBe(3)
  })

  it('a fully sold-out product (0 available) cannot be added at all', () => {
    const { result } = setup([catalogProduct({ id: 'sf4', name: 'Sold Out Bag', price: 10, stock: 0 })])
    let outcome
    act(() => {
      outcome = result.current.addItem('sf4', 1)
    })
    expect(outcome).toEqual({ ok: false, available: 0, requested: 1 })
    expect(result.current.items).toEqual([])
  })

  it('rejects a negative or zero add request cleanly', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.addItem('sf1', -3)
    })
    expect(outcome.ok).toBe(false)
    expect(result.current.items).toEqual([])
  })

  it('accounts for units already committed to open orders, not just physical stock', () => {
    const { result } = setup()
    act(() => {
      result.current.placeOrder({ customerId: 'c1', items: [{ productId: 'sf1', quantity: 8 }] })
    })
    // 10 on hand, 8 already committed to the order just placed: only 2 left for this cart.
    let outcome
    act(() => {
      outcome = result.current.addItem('sf1', 5)
    })
    expect(outcome).toEqual({ ok: false, available: 2, requested: 5 })
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('never counts a discontinued product as available, even if it is somehow requested', () => {
    const { result } = setup()
    let outcome
    act(() => {
      outcome = result.current.addItem('sf3', 1)
    })
    expect(outcome.ok).toBe(false)
    expect(outcome.available).toBe(0)
    expect(result.current.items).toEqual([])
  })
})

describe('CartProvider: stays in sync with the live catalog', () => {
  it('drops a line from the cart display if the product becomes inactive after being added', () => {
    const { result, rerender } = renderHook(() => ({ ...useCart(), ...useProducts() }), {
      wrapper: ({ children, initialProducts }) => (
        <ProductsProvider initialProducts={initialProducts ?? CATALOG} initialMovements={[]}>
          <OrdersProvider>
            <CartProvider>{children}</CartProvider>
          </OrdersProvider>
        </ProductsProvider>
      ),
    })
    act(() => {
      result.current.addItem('sf1', 1)
    })
    expect(result.current.items).toHaveLength(1)

    act(() => {
      result.current.updateProduct('sf1', { ...CATALOG[0], status: 'discontinued', stock: '10', price: '120', cost: '20', lowStockThreshold: '2' })
    })
    rerender()
    expect(result.current.items).toEqual([])
  })
})
