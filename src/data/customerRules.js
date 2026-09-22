// Deliberately simple: something@something.tld, no spaces. Real deliverability is a backend concern.
// (Same pattern as the business email on Settings, so the two forms agree on what "valid" means.)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_MAX = 80
const PHONE_MAX = 30
const ADDRESS_FIELD_MAX = 80
const ZIP_MAX = 15

function idNumber(id) {
  const match = /^c(\d+)$/.exec(id)
  return match ? Number(match[1]) : 0
}

/** Next id, e.g. c051: one past the highest currently in use, seeded or created. */
export function generateCustomerId(customers) {
  const highest = customers.reduce((max, customer) => Math.max(max, idNumber(customer.id)), 0)
  return `c${String(highest + 1).padStart(3, '0')}`
}

/** The customer with this email, ignoring case and surrounding whitespace; null if none. */
export function findCustomerByEmail(email, customers) {
  const normalized = String(email ?? '').trim().toLowerCase()
  if (!normalized) return null
  return customers.find((customer) => customer.email.trim().toLowerCase() === normalized) ?? null
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Validates raw values for a new customer (e.g. from a future Storefront checkout). Returns
 * { field: message }; an empty object means valid. A duplicate email (case-insensitive) is refused
 * up front, so the same shopper never gets two records.
 */
export function validateCustomer(values, customers) {
  const errors = {}
  const v = values ?? {}
  const address = v.shippingAddress ?? {}

  const name = text(v.name)
  if (!name) errors.name = 'Enter a name.'
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`

  const email = text(v.email)
  if (!email) errors.email = 'Enter an email address.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address, like name@example.com.'
  else if (findCustomerByEmail(email, customers)) errors.email = 'A customer with this email already exists.'

  const phone = text(v.phone)
  if (!phone) errors.phone = 'Enter a phone number.'
  else if (phone.length > PHONE_MAX) errors.phone = `Keep the phone number under ${PHONE_MAX} characters.`

  const street = text(address.street)
  if (!street) errors.street = 'Enter a street address.'
  else if (street.length > ADDRESS_FIELD_MAX) errors.street = `Keep the street address under ${ADDRESS_FIELD_MAX} characters.`

  const city = text(address.city)
  if (!city) errors.city = 'Enter a city.'
  else if (city.length > ADDRESS_FIELD_MAX) errors.city = `Keep the city under ${ADDRESS_FIELD_MAX} characters.`

  const state = text(address.state)
  if (!state) errors.state = 'Enter a state.'
  else if (state.length > ADDRESS_FIELD_MAX) errors.state = `Keep the state under ${ADDRESS_FIELD_MAX} characters.`

  const zip = text(address.zip)
  if (!zip) errors.zip = 'Enter a ZIP or postal code.'
  else if (zip.length > ZIP_MAX) errors.zip = `Keep the ZIP code under ${ZIP_MAX} characters.`

  return errors
}

/**
 * Converts validated values into the stored customer shape. `city` and `state` are mirrored at the
 * top level, matching the seeded customers, so the existing Customers pages (built before shipping
 * addresses existed) keep reading them exactly as before.
 */
export function normalizeCustomerValues(values) {
  const address = values.shippingAddress ?? {}
  const shippingAddress = {
    street: text(address.street),
    city: text(address.city),
    state: text(address.state),
    zip: text(address.zip),
  }

  return {
    name: text(values.name),
    email: text(values.email),
    phone: text(values.phone),
    city: shippingAddress.city,
    state: shippingAddress.state,
    shippingAddress,
  }
}
