import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router-dom'
import App from '../../App.jsx'
import { OrdersProvider } from '../../context/OrdersContext.jsx'
import { ProductsProvider } from '../../context/ProductsContext.jsx'
import { getCommittedUnits } from '../../data/availability.js'
import { ORDERS } from '../../data/orders.js'
import { PRODUCTS } from '../../data/products.js'
import { getProductStats, getProductSummary, getTopProducts } from '../../data/selectors.js'
import { formatCurrency } from '../../utils/format.js'
import Products from './Products.jsx'

const stats = getProductStats(PRODUCTS, ORDERS)
const summary = getProductSummary(PRODUCTS)
const byName = (name) => stats.find((entry) => entry.product.name === name)

function renderProducts(entry = '/products', catalog = PRODUCTS) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ProductsProvider initialProducts={catalog}>
        <OrdersProvider>
          <Products />
        </OrdersProvider>
      </ProductsProvider>
    </MemoryRouter>,
  )
}

const rows = () => screen.getAllByRole('button', { name: /^View product / })
const rowNames = () => rows().map((row) => row.textContent)
const searchBox = () => screen.getByRole('searchbox', { name: /search products/i })
const control = (name) => screen.getByRole('combobox', { name })
const setValue = (element, value) => fireEvent.change(element, { target: { value } })
const metric = (label) => screen.getByText(label).closest('.metric-card')
const localeSort = (names) => [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

function openProduct(name) {
  // Products beyond page 1 aren't in the DOM; narrow the list with the search box first.
  if (!rows().some((button) => button.textContent === name)) setValue(searchBox(), name)
  const row = rows().find((button) => button.textContent === name)
  row.focus()
  fireEvent.click(row)
  return { row, dialog: screen.getByRole('dialog', { name }) }
}

function tile(dialog, label) {
  return within(dialog).getByText(label).closest('div')
}

describe('Products page: browsing', () => {
  it('renders the header, derived metrics and the first page of products', () => {
    renderProducts()
    expect(screen.getByRole('heading', { name: 'Products', level: 1 })).toBeInTheDocument()
    expect(rows()).toHaveLength(10)

    expect(within(metric('Total Products')).getByText(String(PRODUCTS.length))).toBeInTheDocument()
    expect(within(metric('Total Products')).getByText(`${summary.active} active · ${summary.discontinued} discontinued`)).toBeInTheDocument()
    expect(within(metric('Inventory Value')).getByText(formatCurrency(summary.inventoryValue))).toBeInTheDocument()
    expect(within(metric('Needs Restock')).getByText(String(summary.lowStock + summary.outOfStock))).toBeInTheDocument()
    expect(within(metric('Avg. Margin')).getByText(`${(summary.averageMargin * 100).toFixed(1)}%`)).toBeInTheDocument()
  })

  it('shows a mobile card for every product row', () => {
    const { container } = renderProducts()
    expect(container.querySelectorAll('.products-list__card')).toHaveLength(10)
  })

  it('flags low stock on active products only', () => {
    renderProducts()
    setValue(control('Stock'), 'Low stock')
    expect(rowNames().sort()).toEqual(['Commuter Messenger Bag', 'Leather Weekender', 'Rolling Carry-On'])
    rows().forEach((row) => expect(within(row.closest('tr')).getByText('Low stock')).toBeInTheDocument())

    // The discontinued, zero-stock Desk Organizer Tray isn't flagged.
    setValue(control('Stock'), 'Out of stock')
    const tray = within(rows()[0].closest('tr'))
    expect(rows()[0]).toHaveTextContent('Desk Organizer Tray')
    expect(tray.queryByText('Out of stock')).not.toBeInTheDocument()
  })

  it('paginates and returns to page 1 when a filter changes', () => {
    renderProducts()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    setValue(control('Sort'), 'price_desc')
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
  })
})

describe('Products page: search, filters and sorting', () => {
  it('searches by product name', () => {
    renderProducts()
    setValue(searchBox(), 'TOTE')
    expect(rowNames().sort()).toEqual(['Everyday Tote', 'Foldable Tote'])
  })

  it('searches by SKU', () => {
    renderProducts()
    setValue(searchBox(), 'nx-tec-07')
    expect(rowNames()).toEqual(['Tech Organizer'])
  })

  it('filters by category', () => {
    renderProducts()
    setValue(control('Category'), 'Tech')
    const expected = PRODUCTS.filter((p) => p.category === 'Tech').map((p) => p.name)
    expect(rowNames()).toEqual(localeSort(expected))
  })

  it('filters by status', () => {
    renderProducts()
    setValue(control('Status'), 'discontinued')
    expect(rowNames()).toEqual(['Desk Organizer Tray', 'Foldable Tote'])
  })

  it('combines search with category and status', () => {
    renderProducts()
    setValue(control('Category'), 'Bags')
    setValue(control('Status'), 'active')
    setValue(searchBox(), 'tote')
    expect(rowNames()).toEqual(['Everyday Tote'])
  })

  it.each([
    ['price_desc', () => PRODUCTS.reduce((a, b) => (b.price > a.price ? b : a)).name],
    ['price_asc', () => PRODUCTS.reduce((a, b) => (b.price < a.price ? b : a)).name],
    ['sales', () => stats.reduce((a, b) => (b.unitsSold > a.unitsSold ? b : a)).product.name],
    ['stock', () => PRODUCTS.reduce((a, b) => (b.stock < a.stock ? b : a)).name],
  ])('sorts by %s', (sort, expectedFirst) => {
    renderProducts()
    setValue(control('Sort'), sort)
    expect(rowNames()[0]).toBe(expectedFirst())
  })

  it('shows Clear filters only when needed, and resets every control', () => {
    renderProducts()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()

    setValue(searchBox(), 'bag')
    setValue(control('Category'), 'Bags')
    setValue(control('Status'), 'active')
    setValue(control('Stock'), 'In stock')
    setValue(control('Sort'), 'sales')
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(searchBox()).toHaveValue('')
    expect(control('Category')).toHaveValue('All')
    expect(control('Status')).toHaveValue('All')
    expect(control('Stock')).toHaveValue('All')
    expect(control('Sort')).toHaveValue('name')
    expect(rows()).toHaveLength(10)
  })

  it('shows an empty state when nothing matches', () => {
    renderProducts()
    setValue(searchBox(), 'no such product')
    expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0])
    expect(screen.queryByText('No products match your filters')).not.toBeInTheDocument()
  })

  it('offers to add the first product when the catalog is empty', () => {
    renderProducts('/products', [])
    expect(screen.getByText('No products yet')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Add product' })[1])
    expect(screen.getByRole('dialog', { name: 'Add product' })).toBeInTheDocument()
  })
})

describe('Products page: details drawer', () => {
  it('shows product information, pricing, stock and sales derived from orders', () => {
    renderProducts()
    setValue(searchBox(), 'Rolling Carry-On')
    const { dialog } = openProduct('Rolling Carry-On')
    const entry = byName('Rolling Carry-On')

    expect(within(dialog).getByText('NX-TRA-19')).toBeInTheDocument()
    expect(within(dialog).getByText(/Travel · Added/)).toBeInTheDocument()
    expect(within(tile(dialog, 'Price')).getByText('$219.00')).toBeInTheDocument()
    expect(within(tile(dialog, 'Unit cost')).getByText('$104.00')).toBeInTheDocument()
    expect(within(tile(dialog, 'Profit per unit')).getByText('$115.00')).toBeInTheDocument()
    expect(within(tile(dialog, 'Margin')).getByText('52.5%')).toBeInTheDocument()
    expect(within(tile(dialog, 'On hand')).getByText('40 units')).toBeInTheDocument()
    expect(within(tile(dialog, 'Low-stock threshold')).getByText('50 units')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Low stock').length).toBeGreaterThan(0)
    expect(within(tile(dialog, 'Units sold')).getByText(String(entry.unitsSold))).toBeInTheDocument()
    expect(within(tile(dialog, 'Revenue')).getByText(formatCurrency(entry.revenue, { decimals: 2 }))).toBeInTheDocument()
    expect(within(tile(dialog, 'Orders')).getByText(String(entry.orderCount))).toBeInTheDocument()
  })

  it('closes with Escape and the close button, returning focus to the row', () => {
    renderProducts()
    const { row } = openProduct('City Bottle')
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(row).toHaveFocus()

    openProduct('City Bottle')
    fireEvent.click(screen.getByRole('button', { name: 'Close product details' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens directly from ?product=<id> and ignores unknown ids', () => {
    const first = renderProducts('/products?product=p03')
    expect(screen.getByRole('dialog', { name: 'Leather Weekender' })).toBeInTheDocument()
    first.unmount()

    renderProducts('/products?product=p999')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Products page: adding a product', () => {
  const fill = (dialog, pairs) => {
    pairs.forEach(([label, value]) => setValue(within(dialog).getByLabelText(label), value))
  }

  function openAddForm() {
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }))
    return screen.getByRole('dialog', { name: 'Add product' })
  }

  it('opens with the first field focused and a suggested SKU', () => {
    renderProducts()
    const dialog = openAddForm()
    expect(within(dialog).getByLabelText(/product name/i)).toHaveFocus()
    expect(within(dialog).getByLabelText(/^sku/i)).toHaveValue('NX-BAG-23')
  })

  it('keeps the suggested SKU in step with the category until the user types their own', () => {
    renderProducts()
    const dialog = openAddForm()
    setValue(within(dialog).getByLabelText(/category/i), 'Tech')
    expect(within(dialog).getByLabelText(/^sku/i)).toHaveValue('NX-TEC-23')

    setValue(within(dialog).getByLabelText(/^sku/i), 'CUSTOM-1')
    setValue(within(dialog).getByLabelText(/category/i), 'Travel')
    expect(within(dialog).getByLabelText(/^sku/i)).toHaveValue('CUSTOM-1')
  })

  it('validates required fields accessibly and focuses the first problem', async () => {
    renderProducts()
    const dialog = openAddForm()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add product' }))

    const name = within(dialog).getByLabelText(/product name/i)
    expect(within(dialog).getByText('Enter a product name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a price.')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name.getAttribute('aria-describedby')).toContain(within(dialog).getByText('Enter a product name.').id)
    await waitFor(() => expect(name).toHaveFocus())
    expect(screen.getAllByRole('button', { name: /^View product / }).length).toBe(10)
  })

  it('does not flag untouched fields just because focus moved away', () => {
    renderProducts()
    const dialog = openAddForm()
    const name = within(dialog).getByLabelText(/product name/i)

    // Focus passing through (e.g. React StrictMode's dev remount) must not raise an error.
    fireEvent.blur(name)
    expect(within(dialog).queryByText('Enter a product name.')).not.toBeInTheDocument()

    // But once the user has typed in a field and clears it, leaving it is flagged.
    setValue(name, 'x')
    setValue(name, '')
    fireEvent.blur(name)
    expect(within(dialog).getByText('Enter a product name.')).toBeInTheDocument()
  })

  it('rejects duplicate names and SKUs and a cost above the price', () => {
    renderProducts()
    const dialog = openAddForm()
    fill(dialog, [[/product name/i, 'city bottle']])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add product' }))
    expect(within(dialog).getByText('A product with this name already exists.')).toBeInTheDocument()

    setValue(within(dialog).getByLabelText(/^sku/i), 'nx-acc-04')
    setValue(within(dialog).getByLabelText(/price/i), '20')
    setValue(within(dialog).getByLabelText(/unit cost/i), '25')
    expect(within(dialog).getByText('This SKU is already in use.')).toBeInTheDocument()
    expect(within(dialog).getByText('Cost can’t be higher than the price.')).toBeInTheDocument()
  })

  it('adds the product, shows it, and updates the metrics', () => {
    renderProducts()
    const dialog = openAddForm()
    fill(dialog, [
      [/product name/i, 'Field Satchel'],
      [/price/i, '80'],
      [/unit cost/i, '30'],
      [/units in stock/i, '25'],
      [/low-stock/i, '10'],
    ])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add product' }))

    // Lands on the new product's details, with confirmation.
    const details = screen.getByRole('dialog', { name: 'Field Satchel' })
    expect(within(details).getByText('NX-BAG-23')).toBeInTheDocument()
    expect(within(tile(details, 'Margin')).getByText('62.5%')).toBeInTheDocument()
    expect(within(tile(details, 'Units sold')).getByText('0')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Added “Field Satchel”.')

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(within(metric('Total Products')).getByText(String(PRODUCTS.length + 1))).toBeInTheDocument()
    expect(within(metric('Total Products')).getByText(`${summary.active + 1} active · ${summary.discontinued} discontinued`)).toBeInTheDocument()
    setValue(searchBox(), 'satchel')
    expect(rowNames()).toEqual(['Field Satchel'])
  })

  it('closes the form without adding when cancelled or dismissed with Escape', () => {
    renderProducts()
    const dialog = openAddForm()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openAddForm()
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(metric('Total Products')).getByText(String(PRODUCTS.length))).toBeInTheDocument()
  })
})

describe('Products page: editing a product', () => {
  function openEditForm(name) {
    const { dialog } = openProduct(name)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit' }))
    return screen.getByRole('dialog', { name: `Edit ${name}` })
  }

  it('opens prefilled, with the first field focused and a note about existing orders', () => {
    renderProducts()
    const form = openEditForm('Urban Backpack')
    expect(within(form).getByLabelText(/product name/i)).toHaveValue('Urban Backpack')
    expect(within(form).getByLabelText(/product name/i)).toHaveFocus()
    expect(within(form).getByLabelText(/^sku/i)).toHaveValue('NX-BAG-01')
    expect(within(form).getByLabelText(/price/i)).toHaveValue(89)
    expect(within(form).getByLabelText(/unit cost/i)).toHaveValue(38)
    expect(within(form).getByText('Existing orders keep the price they were placed at.')).toBeInTheDocument()
  })

  it('saves changes, returns to the details and updates the list', () => {
    renderProducts()
    const form = openEditForm('Urban Backpack')
    setValue(within(form).getByLabelText(/product name/i), 'Urban Backpack Pro')
    setValue(within(form).getByLabelText(/price/i), '95')
    setValue(within(form).getByLabelText(/units in stock/i), '5')
    fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }))

    const details = screen.getByRole('dialog', { name: 'Urban Backpack Pro' })
    expect(within(tile(details, 'Price')).getByText('$95.00')).toBeInTheDocument()
    expect(within(tile(details, 'On hand')).getByText('5 units')).toBeInTheDocument()
    // Stock 5 is now at/below the threshold of 40, so the product is flagged.
    expect(within(details).getAllByText('Low stock').length).toBeGreaterThan(0)
    expect(screen.getByRole('status')).toHaveTextContent('Saved changes to “Urban Backpack Pro”.')

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(rowNames()).toContain('Urban Backpack Pro')
    expect(rowNames()).not.toContain('Urban Backpack')
    expect(within(metric('Needs Restock')).getByText(String(summary.lowStock + summary.outOfStock + 1))).toBeInTheDocument()
  })

  it('lets a product keep its own name and SKU but not take another product\'s', () => {
    renderProducts()
    const form = openEditForm('Urban Backpack')
    fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('dialog', { name: 'Urban Backpack' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const again = screen.getByRole('dialog', { name: 'Edit Urban Backpack' })
    setValue(within(again).getByLabelText(/product name/i), 'City Bottle')
    fireEvent.click(within(again).getByRole('button', { name: 'Save changes' }))
    expect(within(again).getByText('A product with this name already exists.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Edit Urban Backpack' })).toBeInTheDocument()
  })

  it('discards edits when cancelled', () => {
    renderProducts()
    const form = openEditForm('Urban Backpack')
    setValue(within(form).getByLabelText(/product name/i), 'Something Else')
    fireEvent.click(within(form).getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('dialog', { name: 'Urban Backpack' })).toBeInTheDocument()
    expect(rowNames()).toContain('Urban Backpack')
  })
})

describe('Products page: deleting a product', () => {
  const confirmGroup = () => screen.getByRole('group', { name: 'Confirm delete' })

  it('asks for confirmation, explains the order impact, and can be backed out of', () => {
    renderProducts()
    const { dialog } = openProduct('Tech Organizer')
    const entry = byName('Tech Organizer')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(confirmGroup()).toHaveTextContent(`It appears in ${entry.orderCount} orders`)
    expect(confirmGroup()).toHaveTextContent('those orders keep its name and price')
    expect(within(confirmGroup()).getByRole('button', { name: 'Cancel' })).toHaveFocus()

    // Escape backs out of the confirmation but keeps the details open.
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Confirm delete' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Tech Organizer' })).toBeInTheDocument()
    expect(rowNames()).toContain('Tech Organizer')

    // Cancel does the same.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    fireEvent.click(within(confirmGroup()).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('group', { name: 'Confirm delete' })).not.toBeInTheDocument()
  })

  it('deletes after confirmation, updates the list and metrics, and moves focus somewhere sensible', async () => {
    renderProducts()
    const { dialog } = openProduct('Tech Organizer')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    fireEvent.click(within(confirmGroup()).getByRole('button', { name: 'Delete product' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Deleted “Tech Organizer”.')
    expect(within(metric('Total Products')).getByText(String(PRODUCTS.length - 1))).toBeInTheDocument()
    setValue(searchBox(), 'tech organizer')
    expect(screen.getByText('No products match your filters')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add product' })).toHaveFocus())
  })

  it('says so when the product has no order history', () => {
    renderProducts()
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }))
    const form = screen.getByRole('dialog', { name: 'Add product' })
    setValue(within(form).getByLabelText(/product name/i), 'Brand New Thing')
    setValue(within(form).getByLabelText(/price/i), '10')
    setValue(within(form).getByLabelText(/unit cost/i), '4')
    fireEvent.click(within(form).getByRole('button', { name: 'Add product' }))

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(confirmGroup()).toHaveTextContent('It has no order history.')
  })
})

describe('Products connected to the rest of Nexa', () => {
  // Overview opens on 30D, so its Top Products leader is the best seller of that window, not the all-time one.
  const top = getTopProducts(ORDERS, PRODUCTS, 5, '30d')[0]
  const topName = top.product.name
  const orderWithTop = ORDERS.find((order) => order.items.some((item) => item.productId === top.product.id))

  function renderApp(entry = '/products') {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <App />
        <Link to={`/orders?order=${orderWithTop.id}`}>go to the order</Link>
      </MemoryRouter>,
    )
  }

  function editProduct(name, pairs) {
    setValue(searchBox(), name)
    const { dialog } = openProduct(name)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit' }))
    const form = screen.getByRole('dialog', { name: `Edit ${name}` })
    pairs.forEach(([label, value]) => setValue(within(form).getByLabelText(label), value))
    fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }))
  }

  const goToOverview = () => fireEvent.click(screen.getByRole('link', { name: 'Overview' }))
  const overviewCard = (label) =>
    screen.getAllByText(label).map((el) => el.closest('.metric-card')).find(Boolean)
  const topRow = (name) => screen.getByRole('link', { name: `View ${name} in Products` })
  const orderItemNames = () => within(screen.getByRole('dialog')).getAllByRole('row').map((row) => row.textContent)

  it('does not rewrite order history when a price changes', () => {
    renderApp()
    editProduct(topName, [[/price/i, '999']])
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    goToOverview()

    // Top Products revenue still comes from the prices on the orders, not today's price.
    expect(topRow(topName)).toHaveTextContent(formatCurrency(top.revenue))
  })

  it('shows a rename on Overview and inside existing orders', () => {
    renderApp()
    editProduct(topName, [[/product name/i, 'Renamed Best Seller']])
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    goToOverview()
    expect(topRow('Renamed Best Seller')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: `View ${topName} in Products` })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'go to the order' }))
    expect(orderItemNames().some((text) => text.includes('Renamed Best Seller'))).toBe(true)
  })

  it('removes a deleted product from Overview and the catalog counts, while orders keep its original name', () => {
    renderApp()
    const before = getProductSummary(PRODUCTS)
    editProduct(topName, [[/product name/i, 'Soon Deleted']])
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete product' }))

    goToOverview()
    expect(within(overviewCard('Products')).getByText(String(before.total - 1))).toBeInTheDocument()
    expect(within(overviewCard('Products')).getByText(`${before.active - 1} active · ${before.discontinued} discontinued`)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Soon Deleted/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: `View ${topName} in Products` })).not.toBeInTheDocument()

    // The order line falls back to the name captured when it was placed.
    fireEvent.click(screen.getByRole('link', { name: 'go to the order' }))
    expect(orderItemNames().some((text) => text.includes(topName))).toBe(true)
    expect(orderItemNames().some((text) => text.includes('Soon Deleted'))).toBe(false)
  })

  it('counts an added product on Overview', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }))
    const form = screen.getByRole('dialog', { name: 'Add product' })
    setValue(within(form).getByLabelText(/product name/i), 'Overview Test Item')
    setValue(within(form).getByLabelText(/price/i), '10')
    setValue(within(form).getByLabelText(/unit cost/i), '4')
    fireEvent.click(within(form).getByRole('button', { name: 'Add product' }))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    goToOverview()
    expect(within(overviewCard('Products')).getByText(String(PRODUCTS.length + 1))).toBeInTheDocument()
  })

  it('opens a product from Overview Top Products', () => {
    renderApp('/')
    fireEvent.click(topRow(topName))
    expect(screen.getByRole('dialog', { name: topName })).toBeInTheDocument()
  })
})

// The provider refuses to take stock below the units committed to open orders. The form has to say so.
describe('Products page: the stock floor', () => {
  // A real seed product that open (Pending or Processing) orders have already reserved units of.
  const target = PRODUCTS.find((product) => product.status === 'active' && getCommittedUnits(product.id, ORDERS) >= 2)
  const committed = getCommittedUnits(target.id, ORDERS)
  const message = `${committed} units are committed to open orders. On hand can’t go below ${committed}.`

  function openEditForm() {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <App />
      </MemoryRouter>,
    )
    setValue(searchBox(), target.name)
    const { dialog } = openProduct(target.name)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit' }))
    return screen.getByRole('dialog', { name: `Edit ${target.name}` })
  }

  const stockField = (form) => within(form).getByLabelText(/units in stock/i)
  const save = (form) => fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }))

  it('shows the provider’s message on the stock field when the reduction is refused, and keeps the form open', () => {
    const form = openEditForm()
    setValue(stockField(form), String(committed - 1))
    save(form)

    const dialog = screen.getByRole('dialog', { name: `Edit ${target.name}` })
    expect(within(dialog).getByRole('alert')).toHaveTextContent(message)
    expect(stockField(dialog)).toHaveAttribute('aria-invalid', 'true')
    expect(stockField(dialog)).toHaveValue(committed - 1)
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('clears the message when the stock is edited, and then saves a reduction down to the committed units', () => {
    const form = openEditForm()
    setValue(stockField(form), String(committed - 1))
    save(form)
    expect(within(form).getByRole('alert')).toHaveTextContent(message)

    setValue(stockField(form), String(committed))
    expect(within(form).queryByText(message)).not.toBeInTheDocument()
    save(form)

    expect(screen.getByText(`Saved changes to “${target.name}”.`)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: target.name })).toBeInTheDocument()
  })

  it('keeps the existing local messages: an empty stock shows its own message, not the provider’s', () => {
    const form = openEditForm()
    setValue(stockField(form), String(committed - 1))
    save(form)
    expect(within(form).getByText(message)).toBeInTheDocument()

    setValue(stockField(form), '')
    save(form)

    expect(within(form).getByText('Enter the units in stock.')).toBeInTheDocument()
    expect(within(form).queryByText(message)).not.toBeInTheDocument()
  })

  it('does not block editing other fields when the stock is left alone', () => {
    const form = openEditForm()
    setValue(within(form).getByLabelText(/product name/i), `${target.name} Plus`)
    save(form)
    expect(screen.getByText(`Saved changes to “${target.name} Plus”.`)).toBeInTheDocument()
  })
})
