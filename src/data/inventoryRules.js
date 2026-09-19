export const ADJUSTMENT_REASONS = ['Stock count correction', 'Damaged or lost', 'Returned by customer', 'Other']

const RESTOCK_MAX = 100000
const STOCK_MAX = 1000000
const NOTE_MAX = 140

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || value.trim() === '') return NaN
  return Number(value)
}

function validateNote(note, errors) {
  if (String(note ?? '').trim().length > NOTE_MAX) errors.note = `Keep the note under ${NOTE_MAX} characters.`
}

/** Validates a restock (units received). Returns { field: message }; empty means valid. */
export function validateRestock(values, currentStock = 0) {
  const errors = {}
  const quantity = toNumber(values.quantity)

  if (Number.isNaN(quantity)) errors.quantity = 'Enter the number of units received.'
  else if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = 'Enter a whole number of 1 or more.'
  else if (quantity > RESTOCK_MAX) errors.quantity = 'That is more than a single restock can add.'
  else if (currentStock + quantity > STOCK_MAX) errors.quantity = 'Stock on hand would be too high.'

  validateNote(values.note, errors)
  return errors
}

/**
 * Validates a stock adjustment (setting the on-hand count to a new number). It must actually
 * change the count, and "Other" needs a note so the history stays meaningful.
 */
export function validateAdjustment(values, currentStock) {
  const errors = {}
  const newQuantity = toNumber(values.newQuantity)

  if (Number.isNaN(newQuantity)) errors.newQuantity = 'Enter the new on-hand count.'
  else if (!Number.isInteger(newQuantity) || newQuantity < 0) errors.newQuantity = 'Enter a whole number, 0 or more.'
  else if (newQuantity > STOCK_MAX) errors.newQuantity = 'Stock is too high.'
  else if (newQuantity === currentStock) errors.newQuantity = 'That is already the current count.'

  if (!ADJUSTMENT_REASONS.includes(values.reason)) errors.reason = 'Choose a reason.'
  else if (values.reason === 'Other' && !String(values.note ?? '').trim()) {
    errors.note = 'Add a note explaining this adjustment.'
  }

  validateNote(values.note, errors)
  return errors
}
