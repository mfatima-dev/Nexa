import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import Drawer from './Drawer.jsx'

// Opens a drawer from a real button. Note the inline onClose: parents commonly pass a new
// function every render, which must not disturb focus.
function Harness({ onClose = () => {} }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [showTemp, setShowTemp] = useState(true)

  return (
    <>
      <button onClick={() => setOpen(true)}>opener</button>
      {open && (
        <Drawer
          title="Details"
          closeLabel="Close details"
          onClose={() => {
            onClose()
            setOpen(false)
          }}
          footer={<button>Save</button>}
        >
          <button onClick={() => setCount((c) => c + 1)}>increment {count}</button>
          {showTemp && <button onClick={() => setShowTemp(false)}>temporary</button>}
        </Drawer>
      )}
    </>
  )
}

function openDrawer() {
  const opener = screen.getByRole('button', { name: 'opener' })
  opener.focus()
  fireEvent.click(opener)
  return opener
}

describe('Drawer', () => {
  it('renders a labelled modal dialog and moves focus into it', () => {
    render(<Harness />)
    openDrawer()
    const dialog = screen.getByRole('dialog', { name: 'Details' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Close details' })).toHaveFocus()
  })

  it('closes on Escape and returns focus to the opener', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const opener = openDrawer()

    fireEvent.keyDown(document.activeElement, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('closes from the close button and the backdrop', () => {
    const { container } = render(<Harness />)
    openDrawer()
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    openDrawer()
    fireEvent.click(container.querySelector('.drawer__backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('traps Tab and Shift+Tab inside the dialog', () => {
    render(<Harness />)
    openDrawer()
    const close = screen.getByRole('button', { name: 'Close details' })
    const save = screen.getByRole('button', { name: 'Save' })

    save.focus()
    fireEvent.keyDown(save, { key: 'Tab' })
    expect(close).toHaveFocus()

    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(save).toHaveFocus()
  })

  it('does not steal focus when the parent re-renders', () => {
    render(<Harness />)
    openDrawer()
    const increment = screen.getByRole('button', { name: /increment/ })

    increment.focus()
    fireEvent.click(increment)

    expect(screen.getByRole('button', { name: 'increment 1' })).toHaveFocus()
  })

  it('keeps focus inside the dialog when the focused element is removed', () => {
    render(<Harness />)
    openDrawer()
    const temporary = screen.getByRole('button', { name: 'temporary' })

    temporary.focus()
    fireEvent.click(temporary)

    expect(screen.queryByRole('button', { name: 'temporary' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('does not grab focus while it is merely in transit between fields', () => {
    // Regression: a blur handler that updates state re-renders mid-Tab, when activeElement is
    // briefly <body>. The drawer must not treat that as "focus lost" and pull it to the panel.
    function BlurringForm() {
      const [touched, setTouched] = useState(false)
      return (
        <Drawer title="Form" onClose={() => {}}>
          <input aria-label="first" onBlur={() => setTouched(true)} />
          <input aria-label="second" />
          {touched && <p>touched</p>}
        </Drawer>
      )
    }
    render(<BlurringForm />)
    const first = screen.getByLabelText('first')
    first.focus()

    act(() => first.blur())

    expect(screen.getByText('touched')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).not.toHaveFocus()
    expect(document.activeElement).toBe(document.body)
  })

  it('focuses a requested field on open instead of the first focusable element', () => {
    render(
      <Drawer title="Form" onClose={() => {}} initialFocusSelector='[name="second"]'>
        <input name="first" aria-label="first" />
        <input name="second" aria-label="second" />
      </Drawer>,
    )
    expect(screen.getByLabelText('second')).toHaveFocus()
  })

  it('falls back to the first focusable element when the requested field does not exist', () => {
    render(
      <Drawer title="Form" closeLabel="Close form" onClose={() => {}} initialFocusSelector='[name="missing"]'>
        <input name="first" aria-label="first" />
      </Drawer>,
    )
    expect(screen.getByRole('button', { name: 'Close form' })).toHaveFocus()
  })
})
