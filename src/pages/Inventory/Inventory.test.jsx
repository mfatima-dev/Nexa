import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App.jsx'
import { OrdersProvider } from '../../context/OrdersContext.jsx'
import { ProductsProvider } from '../../context/ProductsContext.jsx'
import { getCommittedUnits } from '../../data/availability.js'
import { ORDERS } from '../../data/orders.js'
import { PRODUCTS } from '../../data/products.js'
import { SEED_INVENTORY_MOVEMENTS } from '../../data/inventoryMovements.js'
import { getInventoryStats, getProductMovements } from '../../data/inventorySelectors.js'
import { getProductSummary } from '../../data/selectors.js'
import { formatCurrency } from '../../utils/format.js'
import Inventory from './Inventory.jsx'

const stats = getInventoryStats(PRODUCTS, ORDERS)
const summary = getProductSummary(PRODUCTS)
const byName = (name) => stats.find((entry) => entry.product.name === name)
const MINUS = '−'

function renderInventory(entry = '/inventory', catalog = PRODUCTS) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ProductsProvider initialProducts={catalog}>
        <OrdersProvider>
          <Inventory />
        </OrdersProvider>
      </ProductsProvider>
    </MemoryRouter>,
  )
}

const rows = () => screen.getAllByRole('button', { name: /^Manage stock for / })
const rowNames = () => rows().map((row) => row.textContent)
const searchBox = () => screen.getByRole('searchbox', { name: /search inventory/i })
const control = (name) => screen.getByRole('combobox', { name })
const setValue = (element, value) => fireEvent.change(element, { target: { value } })
const metric = (label) => screen.getByText(label).closest('.metric-card')
const tile = (dialog, label) => within(dialog).getByText(label).closest('div')
const units = (n) => n.toLocaleString('en-US')

function openProduct(name) {
  if (!rows().some((button) => button.textContent === name)) setValue(searchBox(), name)
  const row = rows().find((button) => button.textContent === name)
  row.focus()
  fireEvent.click(row)
  return { row, dialog: screen.getByRole('dialog', { name }) }
}

function openStockForm(name, buttonName) {
  const { dialog } = openProduct(name)
  fireEvent.click(within(dialog).getByRole('button', { name: buttonName }))
  return screen.getByRole('dialog', { name: `Update stock: ${name}` })
}

describe('Inventory page: summary and table', () => {
  it('renders the four summary metrics from the shared products', () => {
    renderInventory()
    expect(screen.getByRole('heading', { name: 'Inventory', level: 1 })).toBeInTheDocument()
    expect(within(metric('Total Units')).getByText(units(summary.unitsInStock))).toBeInTheDocument()
    expect(within(metric('Inventory Value')).getByText(formatCurrency(summary.inventoryValue))).toBeInTheDocument()
    expect(within(metric('Low Stock')).getByText(String(summary.lowStock))).toBeInTheDocument()
    expect(within(metric('Out of Stock')).getByText(String(summary.outOfStock))).toBeInTheDocument()
  })

  it('shows every required column', () => {
    renderInventory()
    ;['Product', 'SKU', 'On hand', 'Threshold', 'Stock status', 'Units sold', 'Stock value'].forEach((name) => {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
    })
  })

  it('shows each product with its own numbers', () => {
    renderInventory()
    const entry = byName('Rolling Carry-On')
    setValue(searchBox(), 'Rolling Carry-On')
    const row = rows()[0].closest('tr')

    expect(within(row).getByText('NX-TRA-19')).toBeInTheDocument()
    expect(within(row).getByText('40')).toBeInTheDocument() // on hand
    expect(within(row).getByText('50')).toBeInTheDocument() // threshold
    expect(within(row).getByText('Low stock')).toBeInTheDocument()
    expect(within(row).getByText(String(entry.unitsSold))).toBeInTheDocument()
    expect(within(row).getByText(formatCurrency(entry.stockValue, { decimals: 2 }))).toBeInTheDocument()
  })

  it('leads with what needs attention, and leaves discontinued products until last', () => {
    renderInventory()
    expect(rowNames().slice(0, 3)).toEqual(['Rolling Carry-On', 'Leather Weekender', 'Commuter Messenger Bag'])

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    // Within discontinued products, the sold-out one comes first.
    expect(rowNames().slice(-2)).toEqual(['Desk Organizer Tray', 'Foldable Tote'])
  })

  it('renders a mobile card for every row', () => {
    const { container } = renderInventory()
    expect(container.querySelectorAll('.inventory-list__card')).toHaveLength(10)
  })
})

describe('Inventory page: search, filters and sorting', () => {
  it('searches by name and by SKU', () => {
    renderInventory()
    setValue(searchBox(), 'tote')
    expect(rowNames().sort()).toEqual(['Everyday Tote', 'Foldable Tote'])

    setValue(searchBox(), 'nx-tec-07')
    expect(rowNames()).toEqual(['Tech Organizer'])
  })

  it('filters by category', () => {
    renderInventory()
    setValue(control('Category'), 'Tech')
    const expected = PRODUCTS.filter((p) => p.category === 'Tech').length
    expect(rows()).toHaveLength(expected)
  })

  it('filters by stock status, and each filter agrees with its summary metric', () => {
    renderInventory()

    setValue(control('Stock status'), 'Low stock')
    expect(rows()).toHaveLength(summary.lowStock)
    rows().forEach((row) => expect(within(row.closest('tr')).getByText('Low stock')).toBeInTheDocument())

    setValue(control('Stock status'), 'Discontinued')
    expect(rowNames().sort()).toEqual(['Desk Organizer Tray', 'Foldable Tote'])

    setValue(control('Stock status'), 'In stock')
    expect(screen.getByText(`${summary.total - summary.lowStock - summary.outOfStock - summary.discontinued} of ${summary.total} products`)).toBeInTheDocument()
  })

  it('shows an empty state for a status with no products', () => {
    renderInventory()
    setValue(control('Stock status'), 'Out of stock')
    expect(summary.outOfStock).toBe(0)
    expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0])
    expect(rows()).toHaveLength(10)
  })

  it.each([
    ['stock_asc', () => PRODUCTS.reduce((a, b) => (b.stock < a.stock ? b : a)).name],
    ['stock_desc', () => PRODUCTS.reduce((a, b) => (b.stock > a.stock ? b : a)).name],
    ['value', () => stats.reduce((a, b) => (b.stockValue > a.stockValue ? b : a)).product.name],
    ['sales', () => stats.reduce((a, b) => (b.unitsSold > a.unitsSold ? b : a)).product.name],
    ['name', () => [...PRODUCTS].map((p) => p.name).sort((a, b) => a.localeCompare(b))[0]],
  ])('sorts by %s', (sort, expectedFirst) => {
    renderInventory()
    setValue(control('Sort'), sort)
    expect(rowNames()[0]).toBe(expectedFirst())
  })

  it('shows Clear filters only when needed and resets every control', () => {
    renderInventory()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()

    setValue(searchBox(), 'bag')
    setValue(control('Category'), 'Bags')
    setValue(control('Stock status'), 'In stock')
    setValue(control('Sort'), 'value')
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(searchBox()).toHaveValue('')
    expect(control('Category')).toHaveValue('All')
    expect(control('Stock status')).toHaveValue('All')
    expect(control('Sort')).toHaveValue('attention')
  })

  it('paginates and returns to page 1 when a filter changes', () => {
    renderInventory()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    setValue(control('Sort'), 'name')
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
  })
})

describe('Inventory page: details drawer and history', () => {
  it('shows stock figures and a history that reconciles with on-hand', () => {
    renderInventory()
    const { dialog } = openProduct('Rolling Carry-On')
    const entry = byName('Rolling Carry-On')
    const history = getProductMovements(SEED_INVENTORY_MOVEMENTS, entry.product)

    expect(within(dialog).getByText('NX-TRA-19')).toBeInTheDocument()
    expect(within(tile(dialog, 'On hand')).getByText('40 units')).toBeInTheDocument()
    expect(within(tile(dialog, 'Low-stock threshold')).getByText('50 units')).toBeInTheDocument()
    expect(within(tile(dialog, 'Stock value')).getByText(formatCurrency(entry.stockValue, { decimals: 2 }))).toBeInTheDocument()
    expect(within(tile(dialog, 'Units sold')).getByText(String(entry.unitsSold))).toBeInTheDocument()
    expect(within(dialog).getByText(/Low stock: 40 on hand/)).toBeInTheDocument()

    // Newest movement first, and its balance is today's on-hand.
    const items = within(dialog).getAllByRole('listitem')
    expect(within(items[0]).getByText('40 on hand')).toBeInTheDocument()
    expect(history.length).toBeGreaterThan(6)
    expect(items).toHaveLength(6)
    fireEvent.click(within(dialog).getByRole('button', { name: `Show all ${history.length} movements` }))
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(history.length)
  })

  it('labels each kind of movement and links fulfillments to the order', () => {
    renderInventory()
    const { dialog } = openProduct('Rolling Carry-On')
    fireEvent.click(within(dialog).getByRole('button', { name: /show all/i }))
    const history = within(dialog.querySelector('.movement-history'))

    expect(history.getAllByText('Order fulfillment').length).toBeGreaterThan(0)
    expect(history.getByText('Restock')).toBeInTheDocument()
    expect(history.getByText('Supplier delivery')).toBeInTheDocument()

    const orderLink = history.getAllByRole('link', { name: /^Order NX-\d+ shipped$/ })[0]
    expect(orderLink.getAttribute('href')).toMatch(/^\/orders\?order=NX-\d+$/)
  })

  it('does not flag discontinued products for restock', () => {
    renderInventory()
    const { dialog } = openProduct('Desk Organizer Tray')
    expect(within(dialog).getByText('Discontinued products are not flagged for restock.')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Discontinued').length).toBeGreaterThan(0)
  })

  it('closes with Escape and returns focus to the row', () => {
    renderInventory()
    const { row } = openProduct('City Bottle')
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(row).toHaveFocus()
  })

  it('opens from ?product=<id> and ignores unknown ids', () => {
    const first = renderInventory('/inventory?product=p03')
    expect(screen.getByRole('dialog', { name: 'Leather Weekender' })).toBeInTheDocument()
    first.unmount()

    renderInventory('/inventory?product=zzz')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows recent stock activity across products', () => {
    renderInventory()
    const section = screen.getByRole('heading', { name: 'Recent stock activity' }).closest('section')
    expect(within(section).getAllByRole('listitem')).toHaveLength(8)
  })
})

describe('Inventory page: restocking', () => {
  it('opens on the quantity field, validates, previews, and records the restock', () => {
    renderInventory()
    const before = getProductSummary(PRODUCTS)
    const form = openStockForm('Rolling Carry-On', 'Restock')
    const quantity = within(form).getByLabelText(/units received/i)

    expect(quantity).toHaveFocus()
    expect(within(form).getByText(/currently/i)).toHaveTextContent('Currently 40 units on hand')

    fireEvent.click(within(form).getByRole('button', { name: 'Record restock' }))
    expect(within(form).getByText('Enter the number of units received.')).toBeInTheDocument()
    expect(quantity).toHaveAttribute('aria-invalid', 'true')

    setValue(quantity, '20')
    setValue(within(form).getByLabelText(/note/i), 'PO-7788')
    expect(within(form).getByText('On hand will go from 40 to 60.')).toBeInTheDocument()
    fireEvent.click(within(form).getByRole('button', { name: 'Record restock' }))

    // Back on the details, everything reflects the new stock.
    const dialog = screen.getByRole('dialog', { name: 'Rolling Carry-On' })
    expect(within(tile(dialog, 'On hand')).getByText('60 units')).toBeInTheDocument()
    const top = within(dialog).getAllByRole('listitem')[0]
    expect(within(top).getByText('Restock')).toBeInTheDocument()
    expect(within(top).getByText('Stock received · PO-7788')).toBeInTheDocument()
    expect(within(top).getByText('+20')).toBeInTheDocument()
    expect(within(top).getByText('60 on hand')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Restocked “Rolling Carry-On”: +20 units. On hand: 60.')

    // The table and the summary move with it: 60 is above the threshold of 50, so it is no longer low.
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(rows().find((r) => r.textContent === 'Rolling Carry-On').getAttribute('aria-label')).toContain('60 on hand, In stock')
    expect(within(metric('Total Units')).getByText(units(before.unitsInStock + 20))).toBeInTheDocument()
    expect(within(metric('Inventory Value')).getByText(formatCurrency(before.inventoryValue + 20 * 104))).toBeInTheDocument()
    expect(within(metric('Low Stock')).getByText(String(before.lowStock - 1))).toBeInTheDocument()
  })

  it('rejects fractions and negatives', () => {
    renderInventory()
    const form = openStockForm('City Bottle', 'Restock')
    const quantity = within(form).getByLabelText(/units received/i)

    setValue(quantity, '2.5')
    fireEvent.blur(quantity)
    expect(within(form).getByText('Enter a whole number of 1 or more.')).toBeInTheDocument()
    setValue(quantity, '-4')
    expect(within(form).getByText('Enter a whole number of 1 or more.')).toBeInTheDocument()
  })

  it('returns to the details when cancelled or dismissed with Escape, recording nothing', () => {
    renderInventory()
    const form = openStockForm('City Bottle', 'Restock')
    fireEvent.click(within(form).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('dialog', { name: 'City Bottle' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restock' }))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'City Bottle' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('Inventory page: adjusting stock', () => {
  const openAdjustment = (name) => {
    const form = openStockForm(name, 'Adjust stock')
    return form
  }

  it('starts on the adjustment type with the current count filled in', () => {
    renderInventory()
    const form = openAdjustment('Leather Weekender')
    expect(within(form).getByRole('radio', { name: /^Adjustment/ })).toBeChecked()
    expect(within(form).getByLabelText(/new on-hand count/i)).toHaveValue(58)
    expect(within(form).getByLabelText(/new on-hand count/i)).toHaveFocus()
  })

  it('refuses an unchanged count', () => {
    renderInventory()
    const form = openAdjustment('Leather Weekender')
    fireEvent.click(within(form).getByRole('button', { name: 'Record adjustment' }))
    expect(within(form).getByText('That is already the current count.')).toBeInTheDocument()
  })

  it('requires a note for "Other"', () => {
    renderInventory()
    const form = openAdjustment('Leather Weekender')
    setValue(within(form).getByLabelText(/new on-hand count/i), '50')
    setValue(within(form).getByLabelText(/reason/i), 'Other')
    fireEvent.click(within(form).getByRole('button', { name: 'Record adjustment' }))
    expect(within(form).getByText('Add a note explaining this adjustment.')).toBeInTheDocument()

    setValue(within(form).getByLabelText(/^note/i), 'Found in returns bin')
    fireEvent.click(within(form).getByRole('button', { name: 'Record adjustment' }))
    expect(screen.getByRole('dialog', { name: 'Leather Weekender' })).toBeInTheDocument()
  })

  it('records the adjustment with its reason and updates stock everywhere on the page', () => {
    renderInventory()
    const before = getProductSummary(PRODUCTS)
    const form = openAdjustment('Leather Weekender')
    setValue(within(form).getByLabelText(/new on-hand count/i), '55')
    setValue(within(form).getByLabelText(/reason/i), 'Damaged or lost')
    expect(within(form).getByText(`On hand will go from 58 to 55 (${MINUS}3).`)).toBeInTheDocument()
    fireEvent.click(within(form).getByRole('button', { name: 'Record adjustment' }))

    const dialog = screen.getByRole('dialog', { name: 'Leather Weekender' })
    const top = within(dialog).getAllByRole('listitem')[0]
    expect(within(top).getByText('Adjustment')).toBeInTheDocument()
    expect(within(top).getByText('Damaged or lost')).toBeInTheDocument()
    expect(within(top).getByText(`${MINUS}3`)).toBeInTheDocument()
    expect(within(top).getByText('55 on hand')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Adjusted “Leather Weekender”: on hand 58 → 55.')

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(within(metric('Total Units')).getByText(units(before.unitsInStock - 3))).toBeInTheDocument()
    expect(within(metric('Inventory Value')).getByText(formatCurrency(before.inventoryValue - 3 * 82))).toBeInTheDocument()
  })

  it('can count a product down to zero, which makes it out of stock', () => {
    renderInventory()
    const before = getProductSummary(PRODUCTS)
    const form = openAdjustment('Leather Weekender')
    setValue(within(form).getByLabelText(/new on-hand count/i), '0')
    fireEvent.click(within(form).getByRole('button', { name: 'Record adjustment' }))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    expect(within(metric('Out of Stock')).getByText(String(before.outOfStock + 1))).toBeInTheDocument()
    expect(within(metric('Low Stock')).getByText(String(before.lowStock - 1))).toBeInTheDocument()
  })

  it('lets you switch between restock and adjustment in the same form', () => {
    renderInventory()
    const form = openStockForm('City Bottle', 'Restock')
    expect(within(form).queryByLabelText(/new on-hand count/i)).not.toBeInTheDocument()
    fireEvent.click(within(form).getByRole('radio', { name: /^Adjustment/ }))
    expect(within(form).getByLabelText(/new on-hand count/i)).toBeInTheDocument()
    expect(within(form).queryByLabelText(/units received/i)).not.toBeInTheDocument()
  })
})

describe('Inventory shares one source of truth with the rest of Nexa', () => {
  function renderApp(entry = '/inventory') {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <App />
      </MemoryRouter>,
    )
  }

  const goTo = (name) => fireEvent.click(screen.getByRole('link', { name }))
  const rowLabel = (name) => rows().find((row) => row.textContent === name).getAttribute('aria-label')

  it('shows a restock recorded on Inventory in Products and on the Overview activity feed', () => {
    renderApp('/inventory')
    const form = openStockForm('Rolling Carry-On', 'Restock')
    setValue(within(form).getByLabelText(/units received/i), '20')
    fireEvent.click(within(form).getByRole('button', { name: 'Record restock' }))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    goTo('Products')
    setValue(screen.getByRole('searchbox', { name: /search products/i }), 'Rolling Carry-On')
    const productRow = screen.getAllByRole('button', { name: /^View product / })[0]
    expect(productRow.getAttribute('aria-label')).toContain('60 in stock')

    goTo('Overview')
    const feed = screen.getByRole('heading', { name: 'Recent Activity' }).closest('section')
    expect(within(feed).getByText('Rolling Carry-On restocked (+20 units)')).toBeInTheDocument()
  })

  it('records a stock edit made on Products in the Inventory history', () => {
    renderApp('/products')
    setValue(screen.getByRole('searchbox', { name: /search products/i }), 'City Bottle')
    fireEvent.click(screen.getAllByRole('button', { name: /^View product / })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const form = screen.getByRole('dialog', { name: 'Edit City Bottle' })
    setValue(within(form).getByLabelText(/units in stock/i), '300')
    fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    goTo('Inventory')
    const { dialog } = openProduct('City Bottle')
    const top = within(dialog).getAllByRole('listitem')[0]
    expect(within(top).getByText('Adjustment')).toBeInTheDocument()
    expect(within(top).getByText('Edited on Products page')).toBeInTheDocument()
    expect(within(top).getByText(`${MINUS}5`)).toBeInTheDocument()
    expect(within(top).getByText('300 on hand')).toBeInTheDocument()
  })

  it('takes stock out when an order ships, and records it against the order', () => {
    renderApp('/orders')
    fireEvent.click(screen.getByRole('button', { name: /^Processing:/ }))
    const orderRow = screen.getAllByRole('button', { name: /view order/i })[0]
    const orderId = orderRow.getAttribute('aria-label').match(/NX-\d+/)[0]
    const order = ORDERS.find((candidate) => candidate.id === orderId)
    fireEvent.click(orderRow)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark as Shipped' }))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    goTo('Inventory')
    order.items.forEach((item) => {
      const product = PRODUCTS.find((p) => p.id === item.productId)
      const expectedStock = product.stock - item.quantity
      setValue(searchBox(), product.sku)
      expect(rowLabel(product.name)).toContain(`${expectedStock} on hand`)

      const { dialog } = openProduct(product.name)
      const top = within(dialog).getAllByRole('listitem')[0]
      expect(within(top).getByRole('link', { name: `Order ${orderId} shipped` })).toBeInTheDocument()
      expect(within(top).getByText(`${MINUS}${item.quantity}`)).toBeInTheDocument()
      expect(within(top).getByText(`${expectedStock} on hand`)).toBeInTheDocument()
      fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    })
  })

  it('leaves stock alone for every other order status change', () => {
    renderApp('/orders')
    fireEvent.click(screen.getByRole('button', { name: /^Pending:/ }))
    const orderRow = screen.getAllByRole('button', { name: /view order/i })[0]
    const orderId = orderRow.getAttribute('aria-label').match(/NX-\d+/)[0]
    const order = ORDERS.find((candidate) => candidate.id === orderId)
    fireEvent.click(orderRow)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark as Processing' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel order' }))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    goTo('Inventory')
    order.items.forEach((item) => {
      const product = PRODUCTS.find((p) => p.id === item.productId)
      setValue(searchBox(), product.sku)
      expect(rowLabel(product.name)).toContain(`${product.stock} on hand`)
    })
  })

  it('links from the Products drawer straight to that product in Inventory', () => {
    renderApp('/products')
    setValue(screen.getByRole('searchbox', { name: /search products/i }), 'Everyday Tote')
    fireEvent.click(screen.getAllByRole('button', { name: /^View product / })[0])
    fireEvent.click(screen.getByRole('link', { name: 'Manage stock in Inventory' }))

    expect(screen.getByRole('dialog', { name: 'Everyday Tote' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restock' })).toBeInTheDocument()
  })

  it('reflects a product deleted from Products: it disappears from Inventory and its counts', async () => {
    renderApp('/products')
    setValue(screen.getByRole('searchbox', { name: /search products/i }), 'Key Pouch')
    fireEvent.click(screen.getAllByRole('button', { name: /^View product / })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete product' }))

    goTo('Inventory')
    setValue(searchBox(), 'Key Pouch')
    expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    const keyPouch = PRODUCTS.find((p) => p.name === 'Key Pouch')
    await waitFor(() =>
      expect(within(metric('Total Units')).getByText(units(summary.unitsInStock - keyPouch.stock))).toBeInTheDocument(),
    )
  })
})

// The provider refuses to take stock below the units committed to open orders. The form has to say so.
describe('Inventory page: the stock floor', () => {
  // A real seed product that open (Pending or Processing) orders have already reserved units of.
  const target = PRODUCTS.find((product) => product.status === 'active' && getCommittedUnits(product.id, ORDERS) >= 2)
  const committed = getCommittedUnits(target.id, ORDERS)
  const message = `${committed} units are committed to open orders. On hand can’t go below ${committed}.`

  function openAdjustment() {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>,
    )
    return openStockForm(target.name, 'Adjust stock')
  }

  const countField = (form) => within(form).getByLabelText(/new on-hand count/i)
  const submit = (form) => fireEvent.click(within(form).getByRole('button', { name: 'Record adjustment' }))

  it('shows the provider’s message on the count field when the reduction is refused, and keeps the form open', () => {
    const form = openAdjustment()
    setValue(countField(form), String(committed - 1))
    submit(form)

    const dialog = screen.getByRole('dialog', { name: `Update stock: ${target.name}` })
    expect(within(dialog).getByRole('alert')).toHaveTextContent(message)
    expect(countField(dialog)).toHaveAttribute('aria-invalid', 'true')
    expect(countField(dialog)).toHaveValue(committed - 1) // the value stays put so it can be corrected
    expect(within(dialog).getByRole('button', { name: 'Record adjustment' })).toBeInTheDocument()
  })

  it('changes nothing when refused: the on-hand count is as before', () => {
    const form = openAdjustment()
    setValue(countField(form), '0')
    submit(form)

    const dialog = screen.getByRole('dialog', { name: `Update stock: ${target.name}` })
    expect(dialog).toHaveTextContent(`Currently ${target.stock} units on hand`)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    const details = screen.getByRole('dialog', { name: target.name })
    expect(within(tile(details, 'On hand')).getByText(`${target.stock} units`)).toBeInTheDocument()
  })

  it('clears the message as soon as the count is edited, and accepts a reduction down to the committed units', () => {
    const form = openAdjustment()
    setValue(countField(form), String(committed - 1))
    submit(form)
    expect(within(form).getByRole('alert')).toHaveTextContent(message)

    setValue(countField(form), String(committed))
    expect(within(form).queryByText(message)).not.toBeInTheDocument()
    submit(form)

    expect(screen.getByText(`Adjusted “${target.name}”: on hand ${target.stock} → ${committed}.`)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: target.name })).toBeInTheDocument()
  })

  it('keeps the existing local messages: an unreadable count shows its own message, not the provider’s', () => {
    const form = openAdjustment()
    setValue(countField(form), String(committed - 1))
    submit(form)
    expect(within(form).getByText(message)).toBeInTheDocument()

    setValue(countField(form), '')
    submit(form)

    expect(within(form).getByText('Enter the new on-hand count.')).toBeInTheDocument()
    expect(within(form).queryByText(message)).not.toBeInTheDocument()
  })

  it('does not get in the way of raising stock', () => {
    const form = openAdjustment()
    setValue(countField(form), String(target.stock + 5))
    submit(form)
    expect(screen.getByText(`Adjusted “${target.name}”: on hand ${target.stock} → ${target.stock + 5}.`)).toBeInTheDocument()
  })
})
