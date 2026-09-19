import { describe, expect, it } from 'vitest'
import { ADJUSTMENT_REASONS, validateAdjustment, validateRestock } from './inventoryRules.js'

describe('validateRestock', () => {
  it('accepts a whole number of units', () => {
    expect(validateRestock({ quantity: '25', note: '' }, 10)).toEqual({})
    expect(validateRestock({ quantity: 25 }, 10)).toEqual({})
  })

  it('requires a quantity', () => {
    expect(validateRestock({ quantity: '' }, 10).quantity).toMatch(/enter the number/i)
  })

  it('rejects zero, negatives and fractions', () => {
    expect(validateRestock({ quantity: '0' }, 10).quantity).toMatch(/whole number/)
    expect(validateRestock({ quantity: '-5' }, 10).quantity).toMatch(/whole number/)
    expect(validateRestock({ quantity: '2.5' }, 10).quantity).toMatch(/whole number/)
  })

  it('rejects an absurd restock or one that would push stock too high', () => {
    expect(validateRestock({ quantity: '100001' }, 0).quantity).toMatch(/more than a single restock/)
    expect(validateRestock({ quantity: '50000' }, 990000).quantity).toMatch(/too high/)
  })

  it('limits the note length', () => {
    expect(validateRestock({ quantity: '5', note: 'x'.repeat(141) }, 0).note).toMatch(/under 140/)
    expect(validateRestock({ quantity: '5', note: 'x'.repeat(140) }, 0).note).toBeUndefined()
  })
})

describe('validateAdjustment', () => {
  const valid = { newQuantity: '7', reason: 'Damaged or lost', note: '' }

  it('accepts a different, valid count with a reason', () => {
    expect(validateAdjustment(valid, 10)).toEqual({})
  })

  it('allows counting down to zero', () => {
    expect(validateAdjustment({ ...valid, newQuantity: '0' }, 10)).toEqual({})
  })

  it('requires a count that actually changes stock', () => {
    expect(validateAdjustment({ ...valid, newQuantity: '10' }, 10).newQuantity).toMatch(/already the current count/)
  })

  it('rejects blank, negative and fractional counts', () => {
    expect(validateAdjustment({ ...valid, newQuantity: '' }, 10).newQuantity).toMatch(/enter the new/i)
    expect(validateAdjustment({ ...valid, newQuantity: '-1' }, 10).newQuantity).toMatch(/whole number/)
    expect(validateAdjustment({ ...valid, newQuantity: '3.5' }, 10).newQuantity).toMatch(/whole number/)
  })

  it('requires a known reason', () => {
    expect(validateAdjustment({ ...valid, reason: 'Because' }, 10).reason).toBeDefined()
    ADJUSTMENT_REASONS.filter((reason) => reason !== 'Other').forEach((reason) => {
      expect(validateAdjustment({ ...valid, reason }, 10)).toEqual({})
    })
  })

  it('requires a note when the reason is "Other"', () => {
    expect(validateAdjustment({ ...valid, reason: 'Other' }, 10).note).toMatch(/add a note/i)
    expect(validateAdjustment({ ...valid, reason: 'Other', note: '  ' }, 10).note).toMatch(/add a note/i)
    expect(validateAdjustment({ ...valid, reason: 'Other', note: 'Found in returns bin' }, 10)).toEqual({})
  })
})
