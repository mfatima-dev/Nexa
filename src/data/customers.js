import { createSeededRandom } from '../utils/seededRandom.js'
import { daysAgoISO } from '../utils/date.js'

// 25 and 23 are coprime with the customer count (50), so index-based pairing
// below produces 50 distinct first/last name combinations with no repeats.
const FIRST_NAMES = [
  'Sarah', 'James', 'Maria', 'David', 'Linda', 'Michael', 'Jennifer', 'Robert', 'Patricia', 'John',
  'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Karen', 'Charles',
  'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty',
]

const LAST_NAMES = [
  'Bennett', 'Carter', 'Diaz', 'Evans', 'Foster', 'Garcia', 'Hughes', 'Ibrahim', 'Jensen', 'Kim',
  'Lopez', 'Mitchell', 'Nguyen', 'Ortiz', 'Parker', 'Quinn', 'Reyes', 'Sanders', 'Turner', 'Underwood',
  'Vasquez', 'Walsh', 'Young',
]

const CITIES = [
  { city: 'Austin', state: 'TX' },
  { city: 'Denver', state: 'CO' },
  { city: 'Portland', state: 'OR' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Raleigh', state: 'NC' },
  { city: 'Phoenix', state: 'AZ' },
  { city: 'Minneapolis', state: 'MN' },
  { city: 'Nashville', state: 'TN' },
  { city: 'Sacramento', state: 'CA' },
  { city: 'Columbus', state: 'OH' },
  { city: 'Salt Lake City', state: 'UT' },
  { city: 'Boston', state: 'MA' },
  { city: 'Atlanta', state: 'GA' },
  { city: 'Kansas City', state: 'MO' },
  { city: 'Seattle', state: 'WA' },
]

const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com']

const random = createSeededRandom(42)
const CUSTOMER_COUNT = 50

export const CUSTOMERS = Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
  const first = FIRST_NAMES[i % FIRST_NAMES.length]
  const last = LAST_NAMES[i % LAST_NAMES.length]
  const location = CITIES[i % CITIES.length]
  const joinedDaysAgo = Math.round(20 + random() * 250)

  return {
    id: `c${String(i + 1).padStart(3, '0')}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${EMAIL_DOMAINS[i % EMAIL_DOMAINS.length]}`,
    city: location.city,
    state: location.state,
    joinedAt: daysAgoISO(joinedDaysAgo),
  }
})
