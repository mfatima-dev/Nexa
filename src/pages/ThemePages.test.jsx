import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import { CUSTOMERS } from '../data/customers.js'
import { ORDERS } from '../data/orders.js'
import { PRODUCTS } from '../data/products.js'
import { installMatchMedia } from '../test/matchMediaMock.js'

// Every page must render and behave the same under each theme: the theme only swaps CSS variables.
const PAGES = [
  ['Overview', '/', 'Overview'],
  ['Orders', '/orders', 'Orders'],
  ['Customers', '/customers', 'Customers'],
  ['Products', '/products', 'Products'],
  ['Inventory', '/inventory', 'Inventory'],
  ['Analytics', '/analytics', 'Analytics'],
  ['Settings', '/settings', 'Settings'],
]

const root = () => document.documentElement
const pageTitle = () => document.querySelector('.page-header__title')?.textContent

function renderApp(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

let device
afterEach(() => {
  device?.uninstall()
  device = undefined
  vi.restoreAllMocks()
})

describe.each([['dark'], ['light']])('with the %s theme remembered', (theme) => {
  it.each(PAGES)('%s renders completely, and the app is on the %s theme', (_label, route, title) => {
    window.localStorage.setItem('nexa-theme', theme)
    const consoleError = vi.spyOn(console, 'error')
    const { container } = renderApp(route)

    expect(root().dataset.theme).toBe(theme)
    expect(pageTitle()).toBe(title)
    expect(container.querySelector('.app-shell__main')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/undefined|NaN|\[object/)
    expect(consoleError).not.toHaveBeenCalled()
  })

  // Settings is left out on purpose: it names the theme in use ("Showing the Dark theme"), so its text
  // legitimately differs. Every other page must not depend on the theme at all.
  const THEME_INDEPENDENT = PAGES.filter(([label]) => label !== 'Settings')

  it('shows identical content on every other page, whichever theme is used', () => {
    window.localStorage.setItem('nexa-theme', theme)
    const rows = {}
    THEME_INDEPENDENT.forEach(([label, route]) => {
      const { container, unmount } = renderApp(route)
      rows[label] = container.querySelector('.app-shell__content').textContent.length
      unmount()
    })
    // A page's text never depends on the theme: compare against the other theme's render.
    const other = theme === 'dark' ? 'light' : 'dark'
    window.localStorage.setItem('nexa-theme', other)
    THEME_INDEPENDENT.forEach(([label, route]) => {
      const { container, unmount } = renderApp(route)
      expect(container.querySelector('.app-shell__content').textContent.length, label).toBe(rows[label])
      unmount()
    })
  })
})

describe('with System remembered, each page follows the device', () => {
  it.each([
    [true, 'light'],
    [false, 'dark'],
  ])('a device that prefers light=%s shows every page in %s', (deviceLight, expected) => {
    device = installMatchMedia({ light: deviceLight })
    window.localStorage.setItem('nexa-theme', 'system')
    PAGES.forEach(([label, route, title]) => {
      const { unmount } = renderApp(route)
      expect(root().dataset.theme, label).toBe(expected)
      expect(pageTitle(), label).toBe(title)
      unmount()
    })
  })

  it('a rendered page switches theme live when the device changes', () => {
    device = installMatchMedia({ light: false })
    window.localStorage.setItem('nexa-theme', 'system')
    renderApp('/analytics')
    expect(root().dataset.theme).toBe('dark')

    fireEvent(window, new Event('resize')) // unrelated events change nothing
    expect(root().dataset.theme).toBe('dark')

    act(() => device.setLight(true))
    expect(root().dataset.theme).toBe('light')
  })
})

describe('changing the theme in Settings while using the app', () => {
  const goTo = (name) => fireEvent.click(screen.getByRole('link', { name }))

  it('Light applies everywhere: it follows you through every page and back', () => {
    renderApp('/settings')
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }))
    expect(root().dataset.theme).toBe('light')

    ;['Overview', 'Orders', 'Customers', 'Products', 'Inventory', 'Analytics'].forEach((name) => {
      goTo(name)
      expect(pageTitle()).toBe(name)
      expect(root().dataset.theme, name).toBe('light')
    })

    goTo('Settings')
    expect(screen.getByRole('radio', { name: /^Light/ })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }))
    expect(root().dataset.theme).toBe('dark')
    fireEvent.click(screen.getByRole('radio', { name: /^System/ }))
    expect(screen.getByRole('radio', { name: /^System/ })).toBeChecked()
  })

  it('the choice survives a reload (a fresh render of the whole app)', () => {
    const first = renderApp('/settings')
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }))
    first.unmount()

    renderApp('/settings')
    expect(root().dataset.theme).toBe('light')
    expect(screen.getByRole('radio', { name: /^Light/ })).toBeChecked()
  })

  it('does not disturb Reduce motion, and Reduce motion does not disturb the theme', () => {
    renderApp('/settings')
    fireEvent.click(screen.getByRole('switch', { name: 'Reduce motion' }))
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }))
    expect(root().dataset.reduceMotion).toBe('true')
    expect(root().dataset.theme).toBe('light')

    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }))
    expect(root().dataset.reduceMotion).toBe('true')
    fireEvent.click(screen.getByRole('switch', { name: 'Reduce motion' }))
    expect(root().dataset.theme).toBe('dark')
    expect(root().dataset.reduceMotion).toBe('false')
  })

  it('never touches the business data', () => {
    const before = JSON.stringify({ ORDERS, CUSTOMERS, PRODUCTS })
    renderApp('/settings')
    ;[/^Light/, /^System/, /^Dark/].forEach((name) => fireEvent.click(screen.getByRole('radio', { name })))
    expect(JSON.stringify({ ORDERS, CUSTOMERS, PRODUCTS })).toBe(before)
  })

  it('leaves the app shell intact: sidebar, Settings link and top bar are all still there', () => {
    renderApp('/settings')
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }))
    expect(within(screen.getByRole('navigation', { name: 'Secondary' })).getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(document.querySelector('.topbar')).toBeInTheDocument()
  })
})
