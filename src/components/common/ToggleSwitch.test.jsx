import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ToggleSwitch from './ToggleSwitch.jsx'

describe('ToggleSwitch', () => {
  it('is a real switch button, named by its label and described by its description', () => {
    render(<ToggleSwitch label="Order notifications" description="New orders and changes." checked={false} onChange={() => {}} />)
    const control = screen.getByRole('switch', { name: 'Order notifications' })
    expect(control.tagName).toBe('BUTTON')
    expect(control).toHaveAccessibleDescription('New orders and changes.')
    expect(control).toHaveAttribute('type', 'button') // never submits a surrounding form
  })

  it('reports on and off through aria-checked', () => {
    const { rerender } = render(<ToggleSwitch label="Alerts" checked={false} onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    rerender(<ToggleSwitch label="Alerts" checked onChange={() => {}} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('asks for the opposite value when activated', () => {
    const onChange = vi.fn()
    const { rerender } = render(<ToggleSwitch label="Alerts" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith(true)

    rerender(<ToggleSwitch label="Alerts" checked onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('takes keyboard focus, and cannot be used when disabled', () => {
    const onChange = vi.fn()
    render(<ToggleSwitch label="Alerts" checked={false} onChange={onChange} disabled />)
    const control = screen.getByRole('switch')
    expect(control).toBeDisabled()
    fireEvent.click(control)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is reachable by Tab when enabled', () => {
    render(<ToggleSwitch label="Alerts" checked={false} onChange={() => {}} />)
    const control = screen.getByRole('switch')
    control.focus()
    expect(control).toHaveFocus()
    expect(control.tabIndex).toBe(0)
  })
})
