import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App.jsx'

describe('App shell', () => {
  it('renders the Nexa brand and primary navigation', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('NEXA')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
  })
})
