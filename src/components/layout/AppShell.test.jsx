import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppShell from './AppShell.jsx'
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from './navItems.js'

// Read from disk: the test runner replaces imported CSS with an empty stylesheet.
const readCss = (name) => readFileSync(join(import.meta.dirname, name), 'utf8')
const appShellCss = readCss('AppShell.css')
const sidebarCss = readCss('Sidebar.css')
const topBarCss = readCss('TopBar.css')

function renderShell(entry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<p>Overview content</p>} />
          <Route path="orders" element={<p>Orders content</p>} />
          <Route path="settings" element={<p>Settings content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const sidebar = () => document.querySelector('.sidebar')
const backdrop = () => document.querySelector('.sidebar__backdrop')

describe('AppShell structure', () => {
  it('keeps the same navigation: six primary items and Settings, in order', () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(['Overview', 'Orders', 'Customers', 'Products', 'Inventory', 'Analytics'])
    expect(SECONDARY_NAV_ITEMS.map((item) => item.label)).toEqual(['Settings'])
    renderShell()
    const primary = within(screen.getByRole('navigation', { name: 'Primary' }))
    const secondary = within(screen.getByRole('navigation', { name: 'Secondary' }))
    expect(primary.getAllByRole('link').map((link) => link.textContent)).toEqual(NAV_ITEMS.map((item) => item.label))
    expect(secondary.getAllByRole('link').map((link) => link.textContent)).toEqual(['Settings'])
  })

  it('lays the sidebar out as brand, then primary navigation, then Settings last', () => {
    renderShell()
    const parts = Array.from(sidebar().children)
    expect(parts.map((part) => part.className)).toEqual(['sidebar__brand', 'sidebar__nav', 'sidebar__nav sidebar__nav--secondary'])
    expect(parts.at(-1)).toContainElement(screen.getByRole('link', { name: 'Settings' }))
  })

  it('puts the top bar and the page in one main column beside the sidebar', () => {
    renderShell()
    const main = document.querySelector('.app-shell__main')
    expect(main.parentElement).toHaveClass('app-shell')
    expect(sidebar().parentElement).toHaveClass('app-shell') // a sibling of the scrolling column, not inside it
    expect(main.contains(sidebar())).toBe(false)
    expect(Array.from(main.children).map((child) => child.tagName)).toEqual(['HEADER', 'MAIN'])
    expect(within(main).getByText('Overview content')).toBeInTheDocument()
  })

  it('renders the page inside the main region', () => {
    renderShell('/orders')
    expect(within(screen.getByRole('main')).getByText('Orders content')).toBeInTheDocument()
  })
})

describe('mobile drawer behavior', () => {
  it('starts closed', () => {
    renderShell()
    expect(sidebar()).not.toHaveClass('sidebar--open')
    expect(backdrop()).not.toHaveClass('sidebar__backdrop--visible')
  })

  it('opens from the menu button, with the backdrop shown', () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(sidebar()).toHaveClass('sidebar--open')
    expect(backdrop()).toHaveClass('sidebar__backdrop--visible')
  })

  it('closes from the backdrop', () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    fireEvent.click(backdrop())
    expect(sidebar()).not.toHaveClass('sidebar--open')
    expect(backdrop()).not.toHaveClass('sidebar__backdrop--visible')
  })

  it('closes from its own close button', () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }))
    expect(sidebar()).not.toHaveClass('sidebar--open')
  })

  it.each([['Orders', 'Orders content'], ['Settings', 'Settings content']])(
    'closes and navigates when %s is chosen',
    (label, content) => {
      renderShell()
      fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
      fireEvent.click(screen.getByRole('link', { name: label }))
      expect(sidebar()).not.toHaveClass('sidebar--open')
      expect(screen.getByText(content)).toBeInTheDocument()
    },
  )

  it('can be reopened after closing', () => {
    renderShell()
    const open = () => fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    open()
    fireEvent.click(backdrop())
    open()
    expect(sidebar()).toHaveClass('sidebar--open')
  })
})

/**
 * jsdom does no layout, so the behaviour that matters here (the sidebar stays put, only the main
 * area scrolls, Settings stays reachable) is pinned by checking the CSS that produces it. If a rule
 * below is changed, the sidebar can scroll away with the page again.
 */
describe('layout contract (CSS)', () => {
  const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
  const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Declarations of the first rule for exactly this selector (top-level rules come before @media).
  function declarations(css, selector) {
    const rule = new RegExp('(?:^|\\})\\s*' + escapeRegExp(selector) + '\\s*\\{([^}]*)\\}')
    const match = strip(css).match(rule)
    if (!match) throw new Error(`No rule found for ${selector}`)
    return match[1]
      .split(';')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/:(.+)/).slice(0, 2).map((part) => part.trim()))
  }
  const has = (css, selector, property, value) =>
    declarations(css, selector).some(([p, v]) => p === property && v === value)
  const properties = (css, selector) => declarations(css, selector).map(([property]) => property)

  it('the shell is exactly one screen tall, never grows, and never scrolls itself', () => {
    expect(has(appShellCss, '.app-shell', 'display', 'flex')).toBe(true)
    expect(has(appShellCss, '.app-shell', 'height', '100vh')).toBe(true) // fallback
    expect(has(appShellCss, '.app-shell', 'height', '100dvh')).toBe(true) // follows phone browser bars
    expect(has(appShellCss, '.app-shell', 'overflow', 'hidden')).toBe(true)
    expect(properties(appShellCss, '.app-shell')).not.toContain('min-height') // min-height let it grow with the page
  })

  it('the main area is the scroller, and can shrink to the shell instead of growing past it', () => {
    expect(has(appShellCss, '.app-shell__main', 'overflow-y', 'auto')).toBe(true)
    expect(has(appShellCss, '.app-shell__main', 'min-height', '0')).toBe(true)
    expect(has(appShellCss, '.app-shell__main', 'flex', '1')).toBe(true)
  })

  it('the top bar still sticks to the top of the scrolling area and is never squeezed', () => {
    expect(has(topBarCss, '.topbar', 'position', 'sticky')).toBe(true)
    expect(has(topBarCss, '.topbar', 'top', '0')).toBe(true)
    expect(has(topBarCss, '.topbar', 'height', '64px')).toBe(true) // the offset Settings' sticky nav relies on
    expect(has(appShellCss, '.app-shell__main > .topbar', 'flex-shrink', '0')).toBe(true)
  })

  it('keeps the existing 252px sidebar, which cannot be pushed taller than the screen', () => {
    expect(has(sidebarCss, '.sidebar', 'width', '252px')).toBe(true)
    expect(has(sidebarCss, '.sidebar', 'flex-shrink', '0')).toBe(true)
    expect(has(sidebarCss, '.sidebar', 'overflow', 'hidden')).toBe(true)
    expect(has(sidebarCss, '.sidebar', 'min-height', '0')).toBe(true)
  })

  it('only the primary navigation scrolls; the brand and Settings never do', () => {
    const primary = '.sidebar__nav:not(.sidebar__nav--secondary)'
    expect(has(sidebarCss, primary, 'flex', '1 1 auto')).toBe(true)
    expect(has(sidebarCss, primary, 'overflow-y', 'auto')).toBe(true)
    expect(has(sidebarCss, '.sidebar__nav', 'min-height', '0')).toBe(true)
    expect(has(sidebarCss, '.sidebar__brand', 'flex-shrink', '0')).toBe(true)
    expect(has(sidebarCss, '.sidebar__nav--secondary', 'flex-shrink', '0')).toBe(true)
    expect(has(sidebarCss, '.sidebar__nav--secondary', 'margin-top', 'auto')).toBe(true) // pinned to the bottom
  })

  it('the scrolling nav leaves room for the keyboard focus ring, without moving any item', () => {
    const primary = '.sidebar__nav:not(.sidebar__nav--secondary)'
    expect(has(sidebarCss, primary, 'margin', 'calc(var(--space-1) * -1)')).toBe(true)
    expect(has(sidebarCss, primary, 'padding', 'var(--space-1)')).toBe(true)
  })

  it('the mobile drawer is unchanged: fixed to the screen edges, off-canvas until opened', () => {
    const mobile = strip(sidebarCss).slice(strip(sidebarCss).indexOf('@media (max-width: 900px)'))
    expect(mobile).toMatch(/\.sidebar\s*\{[^}]*position:\s*fixed[^}]*top:\s*0[^}]*bottom:\s*0[^}]*left:\s*0/)
    expect(mobile).toMatch(/\.sidebar\s*\{[^}]*transform:\s*translateX\(-100%\)/)
    expect(mobile).toMatch(/\.sidebar--open\s*\{[^}]*transform:\s*translateX\(0\)/)
    expect(mobile).toMatch(/\.sidebar__backdrop\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0/)
    // Its height comes from top/bottom; a fixed height here would fight the screen edges.
    expect(mobile).not.toMatch(/\.sidebar\s*\{[^}]*\bheight\s*:/)
  })
})
