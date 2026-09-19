import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App.jsx'
import { SettingsProvider } from '../../context/SettingsContext.jsx'
import { CUSTOMERS } from '../../data/customers.js'
import { ORDERS } from '../../data/orders.js'
import { PRODUCTS } from '../../data/products.js'
import { ADMIN_ACCOUNT, DEFAULT_SETTINGS, NOTIFICATION_OPTIONS } from '../../data/settingsDefaults.js'
import { getDeviceTimeZone } from '../../data/settingsRules.js'
import Settings from './Settings.jsx'

const SESSION_START = new Date(2026, 2, 5, 14, 30, 0) // 5 March 2026, 14:30 local
const SECTION_TITLES = ['General', 'Notifications', 'Appearance', 'Account', 'Danger zone']

beforeAll(() => {
  // jsdom does not implement scrolling.
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(SESSION_START)
})

afterEach(() => {
  vi.useRealTimers()
})

function renderSettings(props = {}) {
  return render(
    <SettingsProvider {...props}>
      <Settings />
    </SettingsProvider>,
  )
}

const nameInput = () => screen.getByRole('textbox', { name: 'Business name' })
const emailInput = () => screen.getByRole('textbox', { name: 'Business email' })
const currencySelect = () => screen.getByRole('combobox', { name: 'Currency' })
const timeZoneSelect = () => screen.getByRole('combobox', { name: 'Time zone' })
const saveButton = () => screen.getByRole('button', { name: 'Save changes' })
const setValue = (element, value) => fireEvent.change(element, { target: { value } })
const section = (title) => screen.getByRole('heading', { name: title, level: 2 }).closest('section')
const switchFor = (name) => screen.getByRole('switch', { name })
const dateTime = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)

describe('Settings page: structure', () => {
  it('shows the page heading and all five sections', () => {
    renderSettings()
    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument()
    SECTION_TITLES.forEach((title) => expect(section(title), title).toBeInTheDocument())
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(SECTION_TITLES)
  })

  it('is upfront about what is remembered (the theme) and what lasts only for this session', () => {
    renderSettings()
    expect(screen.getByText(/Your theme is remembered in this browser/)).toBeInTheDocument()
    expect(screen.getByText(/Other changes apply to this session only/)).toBeInTheDocument()
    expect(screen.getByText(/Nexa doesn’t save business data yet/)).toBeInTheDocument()
  })

  it('has a section nav with a link to every section', () => {
    renderSettings()
    const nav = screen.getByRole('navigation', { name: 'Settings sections' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(SECTION_TITLES)
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#general', '#notifications', '#appearance', '#account', '#danger-zone'])
    links.forEach((link) => expect(document.getElementById(link.getAttribute('href').slice(1))).not.toBeNull())
  })

  it('jumping to a section scrolls to it and moves focus there', () => {
    renderSettings()
    const nav = screen.getByRole('navigation', { name: 'Settings sections' })
    const target = document.getElementById('danger-zone')

    fireEvent.click(within(nav).getByRole('link', { name: 'Danger zone' }))

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    expect(target).toHaveFocus()
  })
})

describe('General settings', () => {
  it('starts with the saved values and nothing to save', () => {
    renderSettings()
    expect(nameInput()).toHaveValue(DEFAULT_SETTINGS.general.businessName)
    expect(emailInput()).toHaveValue(DEFAULT_SETTINGS.general.businessEmail)
    expect(currencySelect()).toHaveValue('USD')
    expect(timeZoneSelect()).toHaveValue('America/New_York')
    expect(saveButton()).toBeDisabled()
    expect(screen.queryByText('You have unsaved changes.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument()
  })

  it('offers real currency and time zone choices', () => {
    renderSettings()
    expect(within(currencySelect()).getAllByRole('option').map((option) => option.value)).toEqual(
      expect.arrayContaining(['USD', 'EUR', 'GBP']),
    )
    expect(within(timeZoneSelect()).getAllByRole('option').length).toBeGreaterThan(10)
  })

  it('says which time zone Nexa really uses today, and that currency is recorded only', () => {
    renderSettings()
    expect(screen.getByText(`Nexa’s pages currently use your device’s time zone (${getDeviceTimeZone()}).`)).toBeInTheDocument()
    expect(screen.getByText(/keep showing US dollars until multi-currency is supported/)).toBeInTheDocument()
  })

  it('editing enables Save and flags unsaved changes', () => {
    renderSettings()
    setValue(nameInput(), 'Acme Trading')

    expect(nameInput()).toHaveValue('Acme Trading')
    expect(saveButton()).toBeEnabled()
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument()
  })

  it('does not treat stray whitespace as a change', () => {
    renderSettings()
    setValue(nameInput(), `  ${DEFAULT_SETTINGS.general.businessName}  `)
    expect(saveButton()).toBeDisabled()
  })

  it('Save applies every edited field and confirms it clearly', () => {
    renderSettings()
    setValue(nameInput(), '  Acme Trading  ')
    setValue(emailInput(), 'team@acme.example')
    setValue(currencySelect(), 'EUR')
    setValue(timeZoneSelect(), 'Europe/London')
    fireEvent.click(saveButton())

    const notice = screen.getByText('General settings saved. They apply to this session only and reset when you reload.')
    expect(notice).toHaveAttribute('role', 'status')
    expect(nameInput()).toHaveValue('Acme Trading') // shown as saved: trimmed
    expect(emailInput()).toHaveValue('team@acme.example')
    expect(currencySelect()).toHaveValue('EUR')
    expect(timeZoneSelect()).toHaveValue('Europe/London')
    expect(saveButton()).toBeDisabled() // nothing left to save
    expect(screen.queryByText('You have unsaved changes.')).not.toBeInTheDocument()
  })

  it('the confirmation goes away as soon as you edit again', () => {
    renderSettings()
    setValue(nameInput(), 'Acme Trading')
    fireEvent.click(saveButton())
    expect(screen.getByText(/General settings saved/)).toBeInTheDocument()

    setValue(nameInput(), 'Acme Trading Ltd')
    expect(screen.queryByText(/General settings saved/)).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('Discard puts the saved values back', () => {
    renderSettings()
    setValue(nameInput(), 'Changed')
    setValue(currencySelect(), 'GBP')
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))

    expect(nameInput()).toHaveValue(DEFAULT_SETTINGS.general.businessName)
    expect(currencySelect()).toHaveValue('USD')
    expect(saveButton()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument()
  })

  it('discarding never touches what was saved before', () => {
    renderSettings()
    setValue(nameInput(), 'Saved Name')
    fireEvent.click(saveButton())
    setValue(nameInput(), 'Never Saved')
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(nameInput()).toHaveValue('Saved Name')
  })
})

describe('General settings: validation', () => {
  it('shows no errors on a form the user has not touched, even when a field is focused and left', () => {
    renderSettings()
    fireEvent.focus(nameInput())
    fireEvent.blur(nameInput())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('flags an emptied business name once the user leaves the field', () => {
    renderSettings()
    setValue(nameInput(), '')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument() // not while still editing

    fireEvent.blur(nameInput())
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your business name.')
    expect(nameInput()).toHaveAttribute('aria-invalid', 'true')
    expect(nameInput()).toHaveAccessibleDescription(expect.stringContaining('Enter your business name.'))
  })

  it.each([
    ['too short', 'A', 'Business name must be at least 2 characters.'],
    ['too long', 'x'.repeat(61), 'Business name must be 60 characters or fewer.'],
  ])('rejects a business name that is %s', (_label, value, message) => {
    renderSettings()
    setValue(nameInput(), value)
    fireEvent.blur(nameInput())
    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })

  it.each([
    ['empty', '', 'Enter a business email address.'],
    ['malformed', 'not-an-email', 'Enter a valid email address, like name@company.com.'],
    ['missing a domain', 'name@', 'Enter a valid email address, like name@company.com.'],
  ])('rejects an email that is %s', (_label, value, message) => {
    renderSettings()
    setValue(emailInput(), value)
    fireEvent.blur(emailInput())
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(emailInput()).toHaveAttribute('aria-invalid', 'true')
  })

  it('will not save an invalid form, shows every error, and moves focus to the first one', async () => {
    renderSettings()
    setValue(nameInput(), '')
    setValue(emailInput(), 'nope')
    fireEvent.click(saveButton())

    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual([
      'Enter your business name.',
      'Enter a valid email address, like name@company.com.',
    ])
    expect(screen.queryByText(/General settings saved/)).not.toBeInTheDocument()
    await waitFor(() => expect(nameInput()).toHaveFocus())
  })

  it('clears an error as soon as the value is fixed, and then Save works', () => {
    renderSettings()
    setValue(emailInput(), 'bad')
    fireEvent.blur(emailInput())
    expect(screen.getByRole('alert')).toBeInTheDocument()

    setValue(emailInput(), 'good@company.example')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(emailInput()).not.toHaveAttribute('aria-invalid')

    fireEvent.click(saveButton())
    expect(screen.getByText(/General settings saved/)).toBeInTheDocument()
  })

  it('an invalid draft never leaks into the rest of the page: Account and email settings show what is saved', () => {
    renderSettings()
    setValue(nameInput(), 'Draft Only Ltd')
    setValue(emailInput(), 'draft@only.example')
    expect(within(section('Account')).queryByText('Draft Only Ltd')).not.toBeInTheDocument()
    expect(screen.queryByText(/draft@only\.example/)).not.toBeInTheDocument()
    expect(screen.getByText(`Also send notifications by email to ${DEFAULT_SETTINGS.general.businessEmail}.`)).toBeInTheDocument()
  })

  it('saved values do flow to the parts of the page that display them', () => {
    renderSettings()
    setValue(nameInput(), 'Acme Trading')
    setValue(emailInput(), 'team@acme.example')
    fireEvent.click(saveButton())

    expect(within(section('Account')).getByText('Acme Trading')).toBeInTheDocument()
    expect(screen.getByText('Also send notifications by email to team@acme.example.')).toBeInTheDocument()
  })
})

describe('Notification settings', () => {
  it('has the four notification switches, on or off as configured', () => {
    renderSettings()
    expect(NOTIFICATION_OPTIONS.map((option) => option.label)).toEqual([
      'Order notifications',
      'Low-stock alerts',
      'Customer activity',
      'Email notifications',
    ])
    expect(switchFor('Order notifications')).toHaveAttribute('aria-checked', 'true')
    expect(switchFor('Low-stock alerts')).toHaveAttribute('aria-checked', 'true')
    expect(switchFor('Customer activity')).toHaveAttribute('aria-checked', 'false')
    expect(switchFor('Email notifications')).toHaveAttribute('aria-checked', 'true')
  })

  it.each(NOTIFICATION_OPTIONS.map((option) => [option.label]))('%s switches on and off', (label) => {
    renderSettings()
    const control = switchFor(label)
    const start = control.getAttribute('aria-checked')

    fireEvent.click(control)
    expect(control).toHaveAttribute('aria-checked', start === 'true' ? 'false' : 'true')
    fireEvent.click(control)
    expect(control).toHaveAttribute('aria-checked', start)
  })

  it('each switch is independent of the others', () => {
    renderSettings()
    fireEvent.click(switchFor('Low-stock alerts'))
    expect(switchFor('Low-stock alerts')).toHaveAttribute('aria-checked', 'false')
    expect(switchFor('Order notifications')).toHaveAttribute('aria-checked', 'true')
    expect(switchFor('Customer activity')).toHaveAttribute('aria-checked', 'false')
    expect(switchFor('Email notifications')).toHaveAttribute('aria-checked', 'true')
  })

  it('announces each change politely, and says what it does and does not do', () => {
    renderSettings()
    fireEvent.click(switchFor('Low-stock alerts'))
    expect(within(section('Notifications')).getByText('Low-stock alerts turned off.')).toHaveAttribute('role', 'status')
    fireEvent.click(switchFor('Customer activity'))
    expect(within(section('Notifications')).getByText('Customer activity turned on.')).toBeInTheDocument()
    expect(screen.getByText(/Nexa doesn’t deliver alerts or send email yet/)).toBeInTheDocument()
  })

  it('names the address that email notifications would go to', () => {
    renderSettings()
    expect(switchFor('Email notifications')).toHaveAccessibleDescription(
      `Also send notifications by email to ${DEFAULT_SETTINGS.general.businessEmail}.`,
    )
  })

  it('toggling a notification does not disturb an unsaved General draft', () => {
    renderSettings()
    setValue(nameInput(), 'Work In Progress')
    fireEvent.click(switchFor('Order notifications'))
    expect(nameInput()).toHaveValue('Work In Progress')
    expect(saveButton()).toBeEnabled()
  })
})

describe('Appearance settings', () => {
  it('keeps Nexa dark by default, and offers System and Light as real choices', () => {
    renderSettings()
    const themes = within(screen.getByRole('group', { name: 'Theme' }))
    expect(themes.getAllByRole('radio').map((radio) => radio.value)).toEqual(['dark', 'system', 'light'])
    expect(themes.getByRole('radio', { name: /^Dark/ })).toBeChecked()
    expect(themes.getByRole('radio', { name: /^System/ })).not.toBeChecked()
    expect(themes.getByRole('radio', { name: /^Light/ })).not.toBeChecked()
    themes.getAllByRole('radio').forEach((radio) => expect(radio).toBeEnabled()) // none is disabled
    expect(screen.queryByText('Not available yet.')).not.toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('choosing System works, is announced, and says what it currently resolves to', () => {
    renderSettings() // no matchMedia in jsdom: the device is treated as dark
    fireEvent.click(screen.getByRole('radio', { name: /^System/ }))

    expect(screen.getByRole('radio', { name: /^System/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /^Dark/ })).not.toBeChecked()
    expect(within(section('Appearance')).getByText('Theme set to System.')).toBeInTheDocument()
    expect(within(section('Appearance')).getByText('Showing the Dark theme, following your device.')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('choosing Light restyles the app at once and is announced', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }))

    expect(screen.getByRole('radio', { name: /^Light/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /^Dark/ })).not.toBeChecked()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(within(section('Appearance')).getByText('Theme set to Light.')).toBeInTheDocument()
    expect(within(section('Appearance')).getByText('Showing the Light theme.')).toBeInTheDocument()
  })

  it('can go back to Dark from Light', () => {
    renderSettings()
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }))
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }))
    expect(screen.getByRole('radio', { name: /^Dark/ })).toBeChecked()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('marks the chosen theme with a check as well as colour, on that card only', () => {
    renderSettings()
    const card = (name) => screen.getByRole('radio', { name }).closest('label')
    const hasCheck = (name) => card(name).querySelector('.appearance-settings__check') !== null

    expect([hasCheck(/^Dark/), hasCheck(/^System/), hasCheck(/^Light/)]).toEqual([true, false, false])
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }))
    expect([hasCheck(/^Dark/), hasCheck(/^System/), hasCheck(/^Light/)]).toEqual([false, false, true])
    expect(card(/^Light/)).toHaveClass('appearance-settings__theme--active')
  })

  describe('keyboard access to the theme choice', () => {
    const radios = () => within(screen.getByRole('group', { name: 'Theme' })).getAllByRole('radio')

    it('is one labelled group of native radio buttons, which the browser moves through with the arrow keys', () => {
      renderSettings()
      const group = screen.getByRole('group', { name: 'Theme' })
      expect(group.tagName).toBe('FIELDSET')
      expect(group.querySelector('legend').textContent).toBe('Theme')
      radios().forEach((radio) => {
        expect(radio.tagName).toBe('INPUT')
        expect(radio).toHaveAttribute('type', 'radio')
        expect(radio).toHaveAttribute('name', 'theme') // same name: one group, one tab stop, arrow-key movement
      })
    })

    it('every theme can take focus, and activating the focused one selects it', () => {
      renderSettings()
      ;['Light', 'System', 'Dark'].forEach((label) => {
        const radio = screen.getByRole('radio', { name: new RegExp(`^${label}`) })
        radio.focus()
        expect(radio).toHaveFocus()
        fireEvent.click(radio) // what Space, or an arrow key onto the radio, does natively
        expect(radio).toBeChecked()
      })
      expect(document.documentElement.dataset.theme).toBe('dark')
    })

    it('comes before Reduce motion in the tab order, and nothing in it is skipped by tabindex', () => {
      renderSettings()
      const all = Array.from(document.querySelectorAll('input[name="theme"], [role="switch"]'))
      const motion = all.indexOf(switchFor('Reduce motion'))
      radios().forEach((radio) => {
        expect(all.indexOf(radio)).toBeLessThan(motion)
        expect(radio.tabIndex).toBeGreaterThanOrEqual(0)
        expect(radio).not.toBeDisabled()
      })
    })

    it('shows a visible focus ring around the whole card', () => {
      const css = readFileSync(join(import.meta.dirname, '..', '..', 'components', 'settings', 'AppearanceSettings.css'), 'utf8')
      const start = css.indexOf('.appearance-settings__theme:has(input:focus-visible) {')
      expect(start).toBeGreaterThan(-1)
      const rule = css.slice(start, css.indexOf('}', start))
      expect(rule).toContain('outline: 2px solid var(--color-accent)')
    })
  })

  it('Reduce motion is a working switch that changes the document preference', () => {
    renderSettings()
    const control = switchFor('Reduce motion')
    expect(control).toHaveAttribute('aria-checked', 'false')
    expect(document.documentElement.dataset.reduceMotion).toBe('false')

    fireEvent.click(control)
    expect(control).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.dataset.reduceMotion).toBe('true')
    expect(within(section('Appearance')).getByText('Reduce motion turned on.')).toBeInTheDocument()

    fireEvent.click(control)
    expect(document.documentElement.dataset.reduceMotion).toBe('false')
  })

  it('describes reduce motion honestly', () => {
    renderSettings()
    expect(switchFor('Reduce motion')).toHaveAccessibleDescription(/Turns off hover and panel transitions/)
  })
})

describe('Account section', () => {
  it('shows the admin profile', () => {
    renderSettings()
    const account = within(section('Account'))
    expect(account.getByText(ADMIN_ACCOUNT.name)).toBeInTheDocument()
    expect(account.getByText('JE')).toBeInTheDocument() // avatar initials
    expect(account.getByText(ADMIN_ACCOUNT.email)).toBeInTheDocument()
    expect(account.getAllByText(ADMIN_ACCOUNT.role)).toHaveLength(2) // the badge and the Role row
    expect(account.getByText(ADMIN_ACCOUNT.access)).toBeInTheDocument()
    expect(account.getByText(DEFAULT_SETTINGS.general.businessName)).toBeInTheDocument()
    expect(account.getByText('January 12, 2026')).toBeInTheDocument()
  })

  it('lays the profile out as labelled terms and descriptions', () => {
    renderSettings()
    const terms = Array.from(section('Account').querySelectorAll('dt')).map((term) => term.textContent)
    expect(terms).toEqual(['Email', 'Role', 'Access', 'Workspace', 'Member since', 'Session type', 'Session started', 'Data storage'])
  })

  it('shows this session, and says plainly that it is a frontend-only demo', () => {
    renderSettings()
    const account = within(section('Account'))
    expect(account.getByText('Demo session (frontend only)')).toBeInTheDocument()
    expect(account.getByText(dateTime(SESSION_START))).toBeInTheDocument()
    expect(account.getByText(/In memory only\. Cleared when you reload the page\./)).toBeInTheDocument()
    expect(account.getByText(/This is a demo account/)).toBeInTheDocument()
    expect(account.getByText(/need a backend, which Nexa doesn’t have yet/)).toBeInTheDocument()
  })

  it('offers no way to change the account, since nothing could be saved', () => {
    renderSettings()
    expect(within(section('Account')).queryAllByRole('button')).toHaveLength(0)
    expect(within(section('Account')).queryAllByRole('textbox')).toHaveLength(0)
  })
})

describe('Danger zone', () => {
  it('is set apart and explains that its actions are unavailable', () => {
    renderSettings()
    const zone = within(section('Danger zone'))
    expect(zone.getByText('Unavailable in this version.')).toBeInTheDocument()
    expect(zone.getByText(/needs saved data and accounts, which Nexa doesn’t have yet/)).toBeInTheDocument()
    expect(section('Danger zone')).toHaveClass('settings__danger')
  })

  it.each([['Reset data'], ['Delete workspace']])('the "%s" action is disabled and points at the reason', (name) => {
    renderSettings()
    const button = within(section('Danger zone')).getByRole('button', { name })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(expect.stringContaining('Unavailable in this version.'))
  })

  it('does nothing when clicked: no dialog, and no setting or data changes', () => {
    const before = JSON.stringify({ ORDERS, CUSTOMERS, PRODUCTS })
    renderSettings()
    const zone = within(section('Danger zone'))
    fireEvent.click(zone.getByRole('button', { name: 'Reset data' }))
    fireEvent.click(zone.getByRole('button', { name: 'Delete workspace' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(nameInput()).toHaveValue(DEFAULT_SETTINGS.general.businessName)
    expect(JSON.stringify({ ORDERS, CUSTOMERS, PRODUCTS })).toBe(before)
  })

  it('describes each action so its consequence is clear even though it is disabled', () => {
    renderSettings()
    const zone = within(section('Danger zone'))
    expect(zone.getByText('Return orders, customers, products and inventory to their starting state.')).toBeInTheDocument()
    expect(zone.getByText('Permanently delete this workspace and everything in it.')).toBeInTheDocument()
  })
})

describe('keyboard and accessibility', () => {
  const controls = () => Array.from(document.querySelectorAll('button, input, select, a[href]')).filter((el) => !el.disabled)

  function accessibleName(element) {
    const labelledBy = element.getAttribute('aria-labelledby')
    if (labelledBy) return labelledBy.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim()
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label')
    if (element.labels?.length) return element.labels[0].textContent.trim()
    return element.textContent.trim()
  }

  it('every control is reachable by keyboard and has an accessible name', () => {
    renderSettings()
    const all = controls()
    expect(all.length).toBeGreaterThan(12)
    all.forEach((element) => {
      expect(element.tabIndex, `${element.tagName} ${accessibleName(element)}`).toBeGreaterThanOrEqual(0)
      expect(accessibleName(element).length, element.outerHTML.slice(0, 80)).toBeGreaterThan(0)
    })
  })

  it('all four switches are native buttons, so Space and Enter work', () => {
    renderSettings()
    screen.getAllByRole('switch').forEach((control) => {
      expect(control.tagName).toBe('BUTTON')
      control.focus()
      expect(control).toHaveFocus()
    })
    expect(screen.getAllByRole('switch')).toHaveLength(5) // four notifications + reduce motion
  })

  it('form errors are announced (role alert) and tied to their field', () => {
    renderSettings()
    setValue(emailInput(), 'bad')
    fireEvent.blur(emailInput())
    const alert = screen.getByRole('alert')
    expect(emailInput().getAttribute('aria-describedby')).toContain(alert.id)
  })

  it('live regions exist for save, notification and appearance feedback', () => {
    renderSettings()
    expect(document.querySelectorAll('[aria-live="polite"], [role="status"]').length).toBeGreaterThanOrEqual(3)
  })

  it('has no stray tab stops: only the section anchors are focusable by script alone', () => {
    renderSettings()
    const scriptOnly = Array.from(document.querySelectorAll('[tabindex="-1"]'))
    expect(scriptOnly.map((el) => el.id).sort()).toEqual(['account', 'appearance', 'danger-zone', 'general', 'notifications'])
  })
})

describe('Settings in the app', () => {
  function renderApp(entry = '/settings') {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <App />
      </MemoryRouter>,
    )
  }
  const goTo = (name) => fireEvent.click(screen.getByRole('link', { name }))
  // The top bar repeats the page name in its own h1, so read the page header's.
  const pageTitle = () => document.querySelector('.page-header__title').textContent

  it('is reachable from the sidebar', () => {
    renderApp('/')
    goTo('Settings')
    expect(pageTitle()).toBe('Settings')
    expect(section('General')).toBeInTheDocument()
  })

  it('keeps saved settings and toggles while you move around the app, until the page is reloaded', () => {
    renderApp('/settings')
    setValue(nameInput(), 'Acme Trading')
    fireEvent.click(saveButton())
    fireEvent.click(switchFor('Customer activity'))
    fireEvent.click(switchFor('Reduce motion'))

    goTo('Orders')
    expect(pageTitle()).toBe('Orders')
    expect(document.documentElement.dataset.reduceMotion).toBe('true') // applies app-wide, not just on Settings

    goTo('Settings')
    expect(nameInput()).toHaveValue('Acme Trading')
    expect(switchFor('Customer activity')).toHaveAttribute('aria-checked', 'true')
    expect(switchFor('Reduce motion')).toHaveAttribute('aria-checked', 'true')
  })

  it('is isolated: saving every kind of setting leaves the business pages and data exactly as they were', () => {
    const before = JSON.stringify({ ORDERS, CUSTOMERS, PRODUCTS })
    renderApp('/settings')
    setValue(nameInput(), 'Acme Trading')
    setValue(currencySelect(), 'EUR')
    fireEvent.click(saveButton())
    fireEvent.click(switchFor('Order notifications'))
    fireEvent.click(screen.getByRole('radio', { name: /^System/ }))

    goTo('Orders')
    expect(pageTitle()).toBe('Orders')
    expect(screen.getAllByRole('button', { name: /view order/i }).length).toBeGreaterThan(0)
    // Currency is a recorded preference only: existing pages still show dollars.
    expect(document.body.textContent).toMatch(/\$\d/)
    expect(document.body.textContent).not.toMatch(/€\s?\d/)

    expect(JSON.stringify({ ORDERS, CUSTOMERS, PRODUCTS })).toBe(before)
  })
})
