import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  // The theme choice is remembered in localStorage; never let one test's choice leak into the next.
  try {
    window.localStorage.clear()
  } catch {
    // Storage isn't available in every test environment.
  }
})
