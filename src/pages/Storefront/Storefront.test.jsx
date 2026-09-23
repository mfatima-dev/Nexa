import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BusinessProviders } from '../../context/BusinessProviders.jsx'
import { useCustomers } from '../../context/useCustomers.js'
import { useOrders } from '../../context/useOrders.js'
import { useProducts } from '../../context/useProducts.js'
import { getAvailableUnits } from '../../data/availability.js'
import { CUSTOMERS } from '../../data/customers.js'
import StorefrontLayout from './StorefrontLayout.jsx'
import StorefrontHome from './StorefrontHome.jsx'
import StorefrontShop from './StorefrontShop.jsx'
import StorefrontProductDetail from './StorefrontProductDetail.jsx'
import StorefrontCart from './StorefrontCart.jsx'
import StorefrontCheckout from './StorefrontCheckout.jsx'
import StorefrontAbout from './StorefrontAbout.jsx'

const catalogProduct = (fields) => ({
  cost: 10,
  lowStockThreshold: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
  ...fields,
})
// Real PRODUCT_CATEGORIES values, since the header/shop filters read that constant directly.
const CATALOG = [
  catalogProduct({ id: 'sf1', name: 'Summit Backpack', category: 'Bags', price: 120, stock: 15, sku: 'SF-BAG-1' }),
  catalogProduct({ id: 'sf2', name: 'Transit Duffel', category: 'Travel', price: 80, stock: 2, sku: 'SF-TRA-2' }),
  catalogProduct({ id: 'sf3', name: 'Field Wallet', category: 'Accessories', price: 25, stock: 10, sku: 'SF-ACC-3' }),
  catalogProduct({ id: 'sf4', name: 'Charge Cable', category: 'Tech', price: 18, stock: 10, sku: 'SF-TEC-4' }),
  catalogProduct({ id: 'sf5', name: 'Retired Tote', category: 'Bags', price: 40, stock: 20, sku: 'SF-BAG-5', status: 'discontinued' }),
]

const VALID_CHECKOUT_VALUES = {
  name: 'Priya Nandakumar',
  email: 'priya.nandakumar@example.com',
  phone: '555-3030',
  street: '88 Harbor Way',
  city: 'Seattle',
  state: 'WA',
  zip: '98101',
}

// Exposes live counts from the same providers the Storefront reads, so a test can confirm exactly one
// customer and one order were created — without duplicating any business rule to check it. Its "Drain"
// button places a real order through the same OrdersContext the checkout page uses, for whatever a
// product's live available count is right now — how a test simulates another shopper (or the admin)
// taking the last units while this shopper is still filling in the checkout form.
function Probe({ drainProductId }) {
  const { customers } = useCustomers()
  const { orders, placeOrder } = useOrders()
  const { products } = useProducts()

  function drain() {
    const available = getAvailableUnits(drainProductId, products, orders)
    if (available > 0) placeOrder({ customerId: CUSTOMERS[0].id, items: [{ productId: drainProductId, quantity: available }] })
  }

  return (
    <div data-testid="probe" data-customers={customers.length} data-orders={orders.length}>
      {drainProductId && (
        <button type="button" onClick={drain}>
          Drain remaining stock
        </button>
      )}
    </div>
  )
}

function renderStorefront(entry = '/store', { products = CATALOG, customers, drainProductId } = {}) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <BusinessProviders initialProducts={products} initialMovements={[]} initialCustomers={customers}>
        <Probe drainProductId={drainProductId} />
        <Routes>
          <Route path="/store" element={<StorefrontLayout />}>
            <Route index element={<StorefrontHome />} />
            <Route path="shop" element={<StorefrontShop />} />
            <Route path="product/:productId" element={<StorefrontProductDetail />} />
            <Route path="cart" element={<StorefrontCart />} />
            <Route path="checkout" element={<StorefrontCheckout />} />
            <Route path="about" element={<StorefrontAbout />} />
          </Route>
        </Routes>
      </BusinessProviders>
    </MemoryRouter>,
  )
}

const probe = () => {
  const el = screen.getByTestId('probe')
  return { customers: Number(el.dataset.customers), orders: Number(el.dataset.orders) }
}
const setValue = (element, value) => fireEvent.change(element, { target: { value } })
const fillCheckoutForm = (values = VALID_CHECKOUT_VALUES) => {
  Object.entries(values).forEach(([field, value]) => setValue(document.getElementById(`checkout-${field}`), value))
}

describe('Storefront product rendering', () => {
  it('shows active products with name, category and price, and never a discontinued one', () => {
    renderStorefront('/store')
    expect(screen.getByText('Summit Backpack')).toBeInTheDocument()
    expect(screen.getByText('$120.00')).toBeInTheDocument()
    expect(screen.getAllByText('Bags').length).toBeGreaterThan(0)
    expect(screen.queryByText('Retired Tote')).not.toBeInTheDocument()
  })

  it('the Shop page lists every active product, and filters correctly by category', () => {
    renderStorefront('/store/shop')
    ;['Summit Backpack', 'Transit Duffel', 'Field Wallet', 'Charge Cable'].forEach((name) =>
      expect(screen.getByText(name)).toBeInTheDocument(),
    )
    expect(screen.queryByText('Retired Tote')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Travel' }))
    expect(screen.getByText('Transit Duffel')).toBeInTheDocument()
    expect(screen.queryByText('Summit Backpack')).not.toBeInTheDocument()
    expect(screen.queryByText('Field Wallet')).not.toBeInTheDocument()
  })

  it('a discontinued product is never reachable, even by a direct link to it', () => {
    renderStorefront('/store/product/sf5')
    expect(screen.getByText('This product isn’t available')).toBeInTheDocument()
    expect(screen.queryByText('Retired Tote')).not.toBeInTheDocument()
  })

  it('an unknown product id shows the same not-available state, not a crash', () => {
    renderStorefront('/store/product/does-not-exist')
    expect(screen.getByText('This product isn’t available')).toBeInTheDocument()
  })
})

describe('Storefront product detail', () => {
  it('shows the name, price, description, available quantity and an add-to-cart control', () => {
    renderStorefront('/store/product/sf1')
    expect(screen.getByRole('heading', { name: 'Summit Backpack', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('$120.00')).toBeInTheDocument()
    expect(screen.getByText(/Summit Backpack from Nexa's Bags collection/)).toBeInTheDocument()
    expect(screen.getByText('15 available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Quantity for Summit Backpack' })).toBeInTheDocument()
  })

  it('adding to cart confirms the addition and updates the header cart count', () => {
    renderStorefront('/store/product/sf1')
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(screen.getByText('Added 1 to your cart.')).toBeInTheDocument()
    expect(screen.getByLabelText('Cart, 1 items')).toBeInTheDocument()
  })
})

describe('Storefront cart: add, update and remove', () => {
  it('adding from the product page, then increasing quantity from the cart, keeps price and subtotal correct', () => {
    renderStorefront('/store/product/sf3') // Field Wallet, $25
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'View cart' }))

    expect(screen.getByText('Field Wallet')).toBeInTheDocument()
    expect(screen.getByText('$25.00 each')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))
    expect(document.querySelector('.sf-qty__value')).toHaveTextContent('2')
    expect(document.querySelector('.sf-cart__line-price')).toHaveTextContent('$50.00') // line total
    expect(screen.getByText('Subtotal').closest('.sf-cart__summary-row')).toHaveTextContent('$50.00')
  })

  it('decreasing to 1 then removing takes the cart back to empty', () => {
    renderStorefront('/store/product/sf3')
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'View cart' }))

    fireEvent.click(screen.getByRole('button', { name: /Remove Field Wallet/ }))
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })

  it('a quick add-to-cart from a product card works without opening the product page', () => {
    renderStorefront('/store/shop')
    const card = screen.getByRole('heading', { name: 'Charge Cable' }).closest('article')
    fireEvent.click(within(card).getByRole('button', { name: 'Add Charge Cable to cart' }))
    expect(screen.getByLabelText('Cart, 1 items')).toBeInTheDocument()
  })
})

describe('Storefront: cannot buy more than is available', () => {
  it('the quantity control on the product page cannot go past what is available', () => {
    renderStorefront('/store/product/sf2') // Transit Duffel, stock 2
    expect(screen.getByText('2 available')).toBeInTheDocument()
    const increase = screen.getByRole('button', { name: 'Increase quantity' })
    fireEvent.click(increase) // 1 -> 2
    expect(increase).toBeDisabled()
  })

  it('the cart never accepts more than the live available count, even via its own stepper', () => {
    renderStorefront('/store/product/sf2')
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' })) // adds 1 of 2
    fireEvent.click(screen.getByRole('link', { name: 'View cart' }))

    const increase = screen.getByRole('button', { name: 'Increase quantity' })
    fireEvent.click(increase) // now at 2, the max
    expect(document.querySelector('.sf-qty__value')).toHaveTextContent('2')
    expect(increase).toBeDisabled()
  })

  it('a sold-out product shows "Sold out" and offers no way to add it', () => {
    renderStorefront('/store/product/sf2', { products: CATALOG.map((p) => (p.id === 'sf2' ? { ...p, stock: 0 } : p)) })
    expect(screen.getByText('Currently sold out.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sold out' })).toBeDisabled()
    expect(screen.queryByRole('group', { name: /Quantity/ })).not.toBeInTheDocument()
  })
})

describe('Storefront checkout: a successful order', () => {
  it('creates a real customer, places a Pending order for exactly the cart, and shows a confirmation', () => {
    renderStorefront('/store/product/sf1')
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'View cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'Checkout' }))

    const before = probe()
    fillCheckoutForm()
    fireEvent.click(screen.getByRole('button', { name: /Place order/ }))

    expect(screen.getByRole('heading', { name: 'Order confirmed' })).toBeInTheDocument()
    expect(document.querySelector('.sf-confirmation__copy')).toHaveTextContent(/NX-\d+/)
    expect(screen.getByText('$120.00', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('88 Harbor Way, Seattle, WA 98101')).toBeInTheDocument()

    const after = probe()
    expect(after.customers).toBe(before.customers + 1)
    expect(after.orders).toBe(before.orders + 1)
  })

  it('empties the cart after a successful order', () => {
    renderStorefront('/store/product/sf1')
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'View cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'Checkout' }))
    fillCheckoutForm()
    fireEvent.click(screen.getByRole('button', { name: /Place order/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Continue shopping' }))

    fireEvent.click(document.querySelector('.sf-header__cart'))
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
  })
})

describe('Storefront checkout: failure never creates a partial order', () => {
  it('a duplicate email refuses the order before any order is created, and creates no customer either', () => {
    renderStorefront('/store/product/sf1', { customers: CUSTOMERS })
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'View cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'Checkout' }))

    const before = probe()
    fillCheckoutForm({ ...VALID_CHECKOUT_VALUES, email: CUSTOMERS[0].email })
    fireEvent.click(screen.getByRole('button', { name: /Place order/ }))

    expect(screen.getByText('A customer with this email already exists.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Order confirmed' })).not.toBeInTheDocument()
    const after = probe()
    expect(after.customers).toBe(before.customers)
    expect(after.orders).toBe(before.orders)
  })

  it('the cart is untouched after a failed checkout, so the shopper can fix the form and retry', () => {
    renderStorefront('/store/product/sf1', { customers: CUSTOMERS })
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'View cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'Checkout' }))
    fillCheckoutForm({ ...VALID_CHECKOUT_VALUES, email: CUSTOMERS[0].email })
    fireEvent.click(screen.getByRole('button', { name: /Place order/ }))

    fireEvent.click(document.querySelector('.sf-header__cart'))
    expect(screen.getByText('Summit Backpack')).toBeInTheDocument()
  })

  it('stock that disappears between adding to cart and checkout is refused, and creates no order — the new customer record is the only side effect', () => {
    renderStorefront('/store/product/sf2', { drainProductId: 'sf2' }) // Transit Duffel, stock 2
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' })) // 1 of 2 in the cart
    fireEvent.click(screen.getByRole('link', { name: 'View cart' }))
    fireEvent.click(screen.getByRole('link', { name: 'Checkout' }))

    const before = probe()
    fillCheckoutForm()
    // Someone else places an order for the only remaining unit while this shopper is filling in the
    // form — through the real OrdersContext.placeOrder, the same one the checkout page calls.
    fireEvent.click(screen.getByRole('button', { name: 'Drain remaining stock' }))
    fireEvent.click(screen.getByRole('button', { name: /Place order/ }))

    const after = probe()
    expect(after.orders).toBe(before.orders + 1) // only the draining order — none for this shopper
    expect(after.customers).toBe(before.customers + 1) // the account was created before the stock check ran
    expect(screen.queryByRole('heading', { name: 'Order confirmed' })).not.toBeInTheDocument()
    expect(screen.getByText(/Your cart changed before checkout/)).toBeInTheDocument()
  })
})

describe('Storefront: layout, navigation and the About page', () => {
  it('renders the header, footer and the About page reachable from the nav', () => {
    renderStorefront('/store')
    expect(screen.getAllByText('NEXA').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('link', { name: 'About' })[0])
    expect(screen.getByRole('heading', { name: 'Made to be used.' })).toBeInTheDocument()
    expect(screen.getByText(/no orders are shipped/)).toBeInTheDocument()
  })
})
