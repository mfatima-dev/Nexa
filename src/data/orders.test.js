import { afterEach, describe, expect, it, vi } from 'vitest'

// The seed is generated when the module is first imported, relative to "now". These tests pin the clock,
// re-import the module and check the dataset that comes out, at times of day that used to matter.
const CLOCKS = [
  '2026-09-19T00:00:00',
  '2026-09-19T00:30:00',
  '2026-09-19T07:59:00',
  '2026-09-19T08:00:00',
  '2026-09-19T09:00:00',
  '2026-09-19T12:00:00',
  '2026-09-19T20:11:00',
  '2026-09-19T23:59:59',
]
const END_OF_DAY = CLOCKS[CLOCKS.length - 1] // after every possible order hour, so nothing is capped
const DAY_MS = 24 * 60 * 60 * 1000

async function generateAt(clock) {
  vi.resetModules()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(clock))
  const { ORDERS } = await import('./orders.js')
  return { orders: ORDERS, now: new Date(clock) }
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const daysAgo = (placedAt, now) => Math.round((startOfDay(now) - startOfDay(new Date(placedAt))) / DAY_MS)
const contentOf = (order) => JSON.stringify([order.customerId, order.status, order.items, order.total])

afterEach(() => {
  vi.useRealTimers()
})

describe('seeded orders are never from the future', () => {
  it.each(CLOCKS)('has no timestamp after the moment of generation (%s)', async (clock) => {
    const { orders, now } = await generateAt(clock)
    orders.forEach((order) => {
      expect(new Date(order.placedAt).getTime()).toBeLessThanOrEqual(now.getTime())
      if (order.shippedAt) expect(new Date(order.shippedAt).getTime()).toBeLessThanOrEqual(now.getTime())
      if (order.deliveredAt) expect(new Date(order.deliveredAt).getTime()).toBeLessThanOrEqual(now.getTime())
    })
  })

  it.each(CLOCKS)('keeps today’s orders on today, inside the working day (%s)', async (clock) => {
    const { orders, now } = await generateAt(clock)
    const windowStart = new Date(now)
    windowStart.setHours(8, 0, 0, 0)
    if (windowStart >= now) windowStart.setHours(0, 0, 0, 0)

    const today = orders.filter((order) => daysAgo(order.placedAt, now) === 0)
    expect(today.length).toBeGreaterThan(0)
    today.forEach((order) => {
      expect(new Date(order.placedAt).getTime()).toBeGreaterThanOrEqual(windowStart.getTime())
    })
  })

  it('leaves every timestamp that was already in the past exactly as drawn', async () => {
    const { orders: untouched } = await generateAt(END_OF_DAY)
    const drawn = untouched.map((order) => order.placedAt)

    for (const clock of CLOCKS) {
      const { orders, now } = await generateAt(clock)
      const placed = new Map()
      orders.forEach((order) => placed.set(order.placedAt, (placed.get(order.placedAt) ?? 0) + 1))
      drawn
        .filter((placedAt) => new Date(placedAt) <= now)
        .forEach((placedAt) => {
          expect(placed.get(placedAt) ?? 0).toBeGreaterThan(0)
          placed.set(placedAt, placed.get(placedAt) - 1)
        })
    }
  })
})

describe('seeded order lifecycle timestamps are chronological', () => {
  it.each(CLOCKS)('never ships or delivers before placement (%s)', async (clock) => {
    const { orders } = await generateAt(clock)
    orders.forEach((order) => {
      const placed = new Date(order.placedAt).getTime()
      if (order.shippedAt) expect(new Date(order.shippedAt).getTime()).toBeGreaterThan(placed)
      if (order.deliveredAt) {
        expect(new Date(order.deliveredAt).getTime()).toBeGreaterThan(new Date(order.shippedAt).getTime())
      }
    })
  })

  it.each(CLOCKS)('has shipping dates exactly for shipped and delivered orders (%s)', async (clock) => {
    const { orders } = await generateAt(clock)
    orders.forEach((order) => {
      expect(order.shippedAt !== null).toBe(order.status === 'Shipped' || order.status === 'Delivered')
      expect(order.deliveredAt !== null).toBe(order.status === 'Delivered')
    })
  })
})

describe('the seeded dataset keeps its size and shape at any time of day', () => {
  it.each(CLOCKS)('has 150 orders, numbered in placement order (%s)', async (clock) => {
    const { orders } = await generateAt(clock)
    expect(orders).toHaveLength(150)
    orders.forEach((order, index) => {
      expect(order.id).toBe(`NX-${1000 + index}`)
      if (index > 0) expect(new Date(order.placedAt) >= new Date(orders[index - 1].placedAt)).toBe(true)
    })
  })

  it('has the same orders (customer, status, items, total) whatever the time of day', async () => {
    const { orders: reference } = await generateAt(END_OF_DAY)
    const expected = reference.map(contentOf).sort()
    for (const clock of CLOCKS) {
      const { orders } = await generateAt(clock)
      expect(orders.map(contentOf).sort()).toEqual(expected)
    }
  })

  it('places the same number of orders on each day, so nothing is dropped from today', async () => {
    const { orders: reference, now: referenceNow } = await generateAt(END_OF_DAY)
    const perDay = (orders, now) => {
      const counts = {}
      orders.forEach((order) => {
        const key = daysAgo(order.placedAt, now)
        counts[key] = (counts[key] ?? 0) + 1
      })
      return counts
    }
    const expected = perDay(reference, referenceNow)
    expect(expected[0]).toBeGreaterThan(0)
    for (const clock of CLOCKS) {
      const { orders, now } = await generateAt(clock)
      expect(perDay(orders, now)).toEqual(expected)
    }
  })

  it('has the approved status mix and revenue whatever the time of day', async () => {
    for (const clock of CLOCKS) {
      const { orders } = await generateAt(clock)
      const counts = {}
      orders.forEach((order) => {
        counts[order.status] = (counts[order.status] ?? 0) + 1
      })
      expect(counts).toEqual({ Pending: 9, Processing: 13, Shipped: 21, Delivered: 96, Cancelled: 11 })
      const revenue = orders.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + order.total, 0)
      expect(revenue).toBeCloseTo(39645, 2)
    }
  })
})

describe('seed generation is deterministic', () => {
  it.each(CLOCKS)('produces identical orders for the same moment (%s)', async (clock) => {
    const first = await generateAt(clock)
    const second = await generateAt(clock)
    expect(second.orders).toEqual(first.orders)
  })
})
