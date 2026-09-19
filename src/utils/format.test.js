import { describe, expect, it } from 'vitest'
import { formatCompactCurrency } from './format.js'

describe('formatCompactCurrency (revenue chart axis)', () => {
  it('keeps small amounts as whole dollars', () => {
    expect(formatCompactCurrency(0)).toBe('$0')
    expect(formatCompactCurrency(400)).toBe('$400')
    expect(formatCompactCurrency(999)).toBe('$999')
  })

  it('shows one decimal so values are never misleadingly rounded', () => {
    expect(formatCompactCurrency(1200)).toBe('$1.2k')
    expect(formatCompactCurrency(1600)).toBe('$1.6k')
    expect(formatCompactCurrency(2500)).toBe('$2.5k')
    expect(formatCompactCurrency(7500)).toBe('$7.5k')
    expect(formatCompactCurrency(12500)).toBe('$12.5k')
  })

  it('drops the decimal for round thousands', () => {
    expect(formatCompactCurrency(1000)).toBe('$1k')
    expect(formatCompactCurrency(2000)).toBe('$2k')
    expect(formatCompactCurrency(10000)).toBe('$10k')
    expect(formatCompactCurrency(400000)).toBe('$400k')
  })

  it('uses millions once thousands would overflow, including at the rounding boundary', () => {
    expect(formatCompactCurrency(1200000)).toBe('$1.2M')
    expect(formatCompactCurrency(3000000)).toBe('$3M')
    expect(formatCompactCurrency(999960)).toBe('$1M') // not "$1000k"
  })

  it('formats the gridlines a real chart produces', () => {
    // The Overview 30D axis: $0, $400, $800, $1.2k, $1.6k.
    expect([0, 400, 800, 1200, 1600].map(formatCompactCurrency)).toEqual(['$0', '$400', '$800', '$1.2k', '$1.6k'])
    // A wider one: $0, $2.5k, $5k, $7.5k, $10k.
    expect([0, 2500, 5000, 7500, 10000].map(formatCompactCurrency)).toEqual(['$0', '$2.5k', '$5k', '$7.5k', '$10k'])
  })

  it('handles negatives and values that are not numbers', () => {
    expect(formatCompactCurrency(-1200)).toBe('-$1.2k')
    expect(formatCompactCurrency(-50)).toBe('-$50')
    expect(formatCompactCurrency(NaN)).toBe('')
    expect(formatCompactCurrency(undefined)).toBe('')
  })
})
