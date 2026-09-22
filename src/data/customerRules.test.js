import { describe, expect, it } from 'vitest'
import {
  findCustomerByEmail,
  generateCustomerId,
  normalizeCustomerValues,
  validateCustomer,
} from './customerRules.js'

const customer = (id, email) => ({ id, name: `Customer ${id}`, email })
const EXISTING = [customer('c001', 'sarah.bennett@gmail.com'), customer('c002', 'james.carter@outlook.com')]

const VALID_VALUES = {
  name: 'Nina Torres',
  email: 'nina.torres@example.com',
  phone: '555-0100',
  shippingAddress: { street: '12 Elm St', city: 'Austin', state: 'TX', zip: '78701' },
}

describe('generateCustomerId', () => {
  it('is one past the highest id currently in use', () => {
    expect(generateCustomerId(EXISTING)).toBe('c003')
    expect(generateCustomerId([customer('c009', 'a@b.com')])).toBe('c010')
    expect(generateCustomerId([customer('c099', 'a@b.com')])).toBe('c100')
  })

  it('starts at c001 for an empty list, and ignores ids that don’t look like c-numbers', () => {
    expect(generateCustomerId([])).toBe('c001')
    expect(generateCustomerId([{ id: 'ghost', email: 'a@b.com' }])).toBe('c001')
  })

  it('never reuses an id, even out of order', () => {
    expect(generateCustomerId([customer('c003', 'a@b.com'), customer('c001', 'b@c.com')])).toBe('c004')
  })
})

describe('findCustomerByEmail', () => {
  it('finds an existing customer by exact email', () => {
    expect(findCustomerByEmail('sarah.bennett@gmail.com', EXISTING)).toBe(EXISTING[0])
  })

  it('matches ignoring case and surrounding whitespace', () => {
    expect(findCustomerByEmail('  Sarah.Bennett@GMAIL.com  ', EXISTING)).toBe(EXISTING[0])
    expect(findCustomerByEmail('JAMES.CARTER@OUTLOOK.COM', EXISTING)).toBe(EXISTING[1])
  })

  it('returns null for an email nobody has, or an empty one', () => {
    expect(findCustomerByEmail('nobody@example.com', EXISTING)).toBeNull()
    expect(findCustomerByEmail('', EXISTING)).toBeNull()
    expect(findCustomerByEmail(undefined, EXISTING)).toBeNull()
  })
})

describe('validateCustomer', () => {
  it('accepts a complete, valid submission (an empty errors object)', () => {
    expect(validateCustomer(VALID_VALUES, EXISTING)).toEqual({})
  })

  it('requires a name, an email, a phone, and every shipping-address field', () => {
    const errors = validateCustomer({}, EXISTING)
    expect(Object.keys(errors).sort()).toEqual(['city', 'email', 'name', 'phone', 'state', 'street', 'zip'])
  })

  it('rejects an unreadable email', () => {
    expect(validateCustomer({ ...VALID_VALUES, email: 'not-an-email' }, EXISTING).email).toMatch(/valid email/)
  })

  it('rejects a duplicate email, case-insensitively', () => {
    expect(validateCustomer({ ...VALID_VALUES, email: 'sarah.bennett@gmail.com' }, EXISTING).email).toMatch(/already exists/)
    expect(validateCustomer({ ...VALID_VALUES, email: '  SARAH.BENNETT@GMAIL.COM  ' }, EXISTING).email).toMatch(/already exists/)
  })

  it('allows an email that only differs from an existing one in the local part or domain', () => {
    expect(validateCustomer({ ...VALID_VALUES, email: 'sarah.bennett@outlook.com' }, EXISTING)).toEqual({})
    expect(validateCustomer({ ...VALID_VALUES, email: 'sarah.bennettt@gmail.com' }, EXISTING)).toEqual({})
  })

  it('does not flag a name, phone or address as too long unless it actually is', () => {
    expect(validateCustomer({ ...VALID_VALUES, name: 'A'.repeat(80) }, EXISTING)).toEqual({})
    expect(validateCustomer({ ...VALID_VALUES, name: 'A'.repeat(81) }, EXISTING).name).toMatch(/under 80/)
  })

  it('treats blank or whitespace-only fields as missing', () => {
    const blank = { name: '  ', email: '  ', phone: '  ', shippingAddress: { street: '  ', city: '  ', state: '  ', zip: '  ' } }
    const errors = validateCustomer(blank, EXISTING)
    expect(Object.keys(errors).sort()).toEqual(['city', 'email', 'name', 'phone', 'state', 'street', 'zip'])
  })

  it('handles a missing shippingAddress object entirely', () => {
    const { shippingAddress, ...withoutAddress } = VALID_VALUES
    void shippingAddress
    const errors = validateCustomer(withoutAddress, EXISTING)
    expect(Object.keys(errors).sort()).toEqual(['city', 'state', 'street', 'zip'])
  })
})

describe('normalizeCustomerValues', () => {
  it('trims every field and keeps the shipping address structured', () => {
    const messy = {
      name: '  Nina Torres  ',
      email: '  nina.torres@example.com  ',
      phone: '  555-0100  ',
      shippingAddress: { street: ' 12 Elm St ', city: ' Austin ', state: ' TX ', zip: ' 78701 ' },
    }
    expect(normalizeCustomerValues(messy)).toEqual({
      name: 'Nina Torres',
      email: 'nina.torres@example.com',
      phone: '555-0100',
      city: 'Austin',
      state: 'TX',
      shippingAddress: { street: '12 Elm St', city: 'Austin', state: 'TX', zip: '78701' },
    })
  })

  it('mirrors city and state at the top level, matching the shape of the seeded customers', () => {
    const normalized = normalizeCustomerValues(VALID_VALUES)
    expect(normalized.city).toBe(normalized.shippingAddress.city)
    expect(normalized.state).toBe(normalized.shippingAddress.state)
  })
})
