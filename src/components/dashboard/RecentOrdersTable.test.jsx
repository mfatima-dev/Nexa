import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RecentOrdersTable from './RecentOrdersTable.jsx'

// Read from disk: the test runner replaces imported CSS with an empty stylesheet, and jsdom has no
// viewport, so the responsive switch is checked as a contract on the stylesheet itself.
const readCss = (path) => readFileSync(join(import.meta.dirname, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const css = readCss('RecentOrdersTable.css')

const ORDERS = [
  { id: 'NX-1149', customerId: 'c001', customerName: 'Charles Walsh', status: 'Pending', total: 461, placedAt: '2026-06-19T12:00:00.000Z' },
  { id: 'NX-1148', customerId: 'c002', customerName: 'Elizabeth Lopez', status: 'Shipped', total: 69.5, placedAt: '2026-06-18T12:00:00.000Z' },
  { id: 'NX-1147', customerId: 'c003', customerName: 'Robert Kim', status: 'Cancelled', total: 1299.99, placedAt: '2026-06-17T12:00:00.000Z' },
]

function renderTable(orders = ORDERS) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RecentOrdersTable orders={orders} />} />
        <Route path="/orders" element={<p>Orders page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

// ---- CSS helpers: find a rule body, and the body of an @media block ------------------------------
function block(source, header) {
  const start = source.indexOf(header)
  if (start === -1) return null
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    if (source[i] === '}') depth -= 1
    if (depth === 0) return source.slice(open + 1, i)
  }
  return null
}
const declarations = (body) =>
  Object.fromEntries(
    (body ?? '')
      .split(';')
      .map((line) => line.split(/:(.*)/s).map((part) => part.trim()))
      .filter(([property, value]) => property && value),
  )
const rule = (source, selector) => declarations(block(source, `${selector} {`))
const mobileBlock = (source) => block(source, '@media (max-width: 720px)')

describe('RecentOrdersTable on tablet and desktop', () => {
  it('still renders the existing table with its five columns', () => {
    renderTable()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Order',
      'Customer',
      'Date',
      'Amount',
      'Status',
    ])
    expect(within(table).getAllByRole('row')).toHaveLength(ORDERS.length + 1)
  })

  it('shows every order field in each table row', () => {
    renderTable()
    const row = within(screen.getByRole('table')).getByText('NX-1148').closest('tr')
    expect(within(row).getByText('Elizabeth Lopez')).toBeInTheDocument()
    expect(within(row).getByText('Jun 18')).toBeInTheDocument()
    expect(within(row).getByText('$69.50')).toBeInTheDocument()
    expect(within(row).getByText('Shipped')).toHaveClass('status-badge', 'status-badge--accent')
  })

  it('keeps the table inside its own horizontal scroll wrapper, so the page never scrolls sideways', () => {
    renderTable()
    expect(screen.getByRole('table').closest('.recent-orders__table-wrap')).not.toBeNull()
    expect(rule(css, '.recent-orders__table-wrap')['overflow-x']).toBe('auto')
    expect(rule(css, '.recent-orders__table')['min-width']).toBe('480px')
  })

  it('shows the table and hides the cards until the mobile breakpoint', () => {
    expect(rule(css, '.recent-orders__cards').display).toBe('none')
    expect(rule(css, '.recent-orders__table-wrap').display).toBeUndefined()
  })
})

describe('RecentOrdersTable on mobile', () => {
  it('switches from the table to the cards at the same breakpoint as Orders, Customers, Products and Inventory', () => {
    const mobile = mobileBlock(css)
    expect(mobile).not.toBeNull()
    expect(rule(mobile, '.recent-orders__table-wrap').display).toBe('none')
    expect(rule(mobile, '.recent-orders__cards').display).toBe('flex')

    ;['orders/OrdersList', 'customers/CustomersList', 'products/ProductsList', 'inventory/InventoryList'].forEach((list) => {
      const other = mobileBlock(readCss(`../${list}.css`))
      expect(other, `${list} has a 720px mobile block`).not.toBeNull()
      expect(other).toMatch(/display:\s*none/)
      expect(other).toMatch(/display:\s*flex/)
    })
  })

  it('lays the cards out as a single column that fits the container', () => {
    const cards = rule(css, '.recent-orders__cards')
    expect(cards['flex-direction']).toBe('column')
    const card = rule(css, '.recent-orders__card')
    expect(card.width).toBe('100%')
    expect(card['box-sizing']).toBe('border-box')
  })

  it('renders one card per order in the same order as the table', () => {
    renderTable()
    const cards = document.querySelectorAll('.recent-orders__cards > li')
    expect(Array.from(cards).map((card) => card.querySelector('.recent-orders__card-id').textContent)).toEqual([
      'NX-1149',
      'NX-1148',
      'NX-1147',
    ])
  })

  it('exposes order ID, customer, date, amount and status on every card, without a horizontal scroller', () => {
    renderTable()
    const cards = Array.from(document.querySelectorAll('.recent-orders__cards > li'))
    const expected = [
      ['NX-1149', 'Charles Walsh', 'Jun 19', '$461.00', 'Pending', 'status-badge--warning'],
      ['NX-1148', 'Elizabeth Lopez', 'Jun 18', '$69.50', 'Shipped', 'status-badge--accent'],
      ['NX-1147', 'Robert Kim', 'Jun 17', '$1,299.99', 'Cancelled', 'status-badge--danger'],
    ]
    cards.forEach((card, index) => {
      const [id, customer, date, amount, status, statusClass] = expected[index]
      const view = within(card)
      expect(view.getByText(id)).toBeInTheDocument()
      expect(view.getByText(customer)).toBeInTheDocument()
      expect(view.getByText(date)).toBeInTheDocument()
      expect(view.getByText(amount)).toHaveClass('recent-orders__card-total')
      expect(view.getByText(status)).toHaveClass('status-badge', statusClass)
      expect(card.querySelector('table')).toBeNull()
    })
  })

  it('uses the same status badge styling as the table', () => {
    renderTable()
    ORDERS.forEach((order) => {
      const badges = screen.getAllByText(order.status)
      expect(badges).toHaveLength(2) // one in the table, one on the card
      expect(badges[0].className).toBe(badges[1].className)
    })
  })

  it('puts the amount and status where they are always visible: the top row and the meta row of the card', () => {
    renderTable()
    const card = document.querySelector('.recent-orders__cards > li')
    expect(card.querySelector('.recent-orders__card-top .status-badge')).not.toBeNull()
    expect(card.querySelector('.recent-orders__card-meta .recent-orders__card-total')).not.toBeNull()
    expect(rule(css, '.recent-orders__card-meta')['flex-wrap']).toBe('wrap')
  })
})

describe('RecentOrdersTable navigation and accessibility', () => {
  it('links the table row and the card to the Orders page, as before', () => {
    renderTable()
    const links = screen.getAllByRole('link', { name: /^View order NX-1149/ })
    expect(links).toHaveLength(2)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/orders'))
  })

  it('opens the Orders page when the card is clicked', () => {
    renderTable()
    const card = document.querySelector('.recent-orders__card')
    fireEvent.click(card)
    expect(screen.getByText('Orders page')).toBeInTheDocument()
  })

  it('opens the Orders page when the table row link is clicked', () => {
    renderTable()
    fireEvent.click(document.querySelector('.recent-orders__row-link'))
    expect(screen.getByText('Orders page')).toBeInTheDocument()
  })

  it('gives the card and the table the same descriptive accessible name', () => {
    renderTable()
    const names = screen.getAllByRole('link').map((link) => link.getAttribute('aria-label'))
    expect(names.filter((name) => name === 'View order NX-1147 — Robert Kim, $1,299.99, Cancelled')).toHaveLength(2)
  })

  it('makes the cards real, focusable links (native keyboard activation), not click handlers on a div', () => {
    renderTable()
    const cards = Array.from(document.querySelectorAll('.recent-orders__card'))
    expect(cards).toHaveLength(ORDERS.length)
    cards.forEach((card) => {
      expect(card.tagName).toBe('A')
      expect(card).toHaveAttribute('href', '/orders')
      expect(card).not.toHaveAttribute('tabindex', '-1')
      card.focus()
      expect(card).toHaveFocus()
    })
  })

  it('never hides the card focus ring', () => {
    expect(css).not.toMatch(/\.recent-orders__card[^{]*:focus[^{]*\{[^}]*outline:\s*none/)
  })
})

describe('RecentOrdersTable empty state', () => {
  it('still shows the empty message, with neither the table nor the cards', () => {
    renderTable([])
    expect(screen.getByText('No orders yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(document.querySelector('.recent-orders__cards')).toBeNull()
  })
})
