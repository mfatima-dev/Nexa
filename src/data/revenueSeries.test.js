import { afterEach, describe, expect, it, vi } from 'vitest'
import { ORDERS } from './orders.js'
import { buildRevenueSeries, computeOverviewMetrics } from './selectors.js'
import { daysAgo, formatDate } from '../utils/date.js'

// The Overview revenue chart must put every order on the day the user experienced it in, and count
// exactly the orders the headline metric counts, in any timezone. These tests switch the process
// timezone and check both. Offsets are in minutes, as Date#getTimezoneOffset reports them (in
// September 2026, before New Zealand's clocks change on the 27th).
const ZONES = [
  { zone: 'UTC', offset: 0 },
  { zone: 'Asia/Karachi', offset: -300 },
  { zone: 'America/Los_Angeles', offset: 420 },
  { zone: 'Pacific/Auckland', offset: -720 },
  { zone: 'Pacific/Kiritimati', offset: -840 }, // UTC+14
  { zone: 'Pacific/Pago_Pago', offset: 660 }, // UTC-11
]

afterEach(() => {
  vi.unstubAllEnvs() // back to the machine's own timezone
})

function inZone({ zone, offset }, run) {
  vi.stubEnv('TZ', zone)
  // Guard: if the switch silently did nothing these tests would prove nothing.
  expect(new Date(2026, 8, 19).getTimezoneOffset(), `${zone} offset`).toBe(offset)
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(zone)
  run()
}

const local = (month, day, hour = 12, minute = 0, year = 2026) => new Date(year, month, day, hour, minute, 0)
const order = (id, placedAt, total, status = 'Delivered') => ({ id, customerId: 'c001', placedAt: placedAt.toISOString(), status, total, items: [] })
const sum = (series) => series.reduce((total, point) => total + point.value, 0)
const valueOn = (series, label) => series.find((point) => point.label === label).value

// "Now" is 23:30 on Saturday 19 September 2026, local time. Times near midnight are the ones that
// used to land on the wrong day. The fixture is built by a function because "local time" depends on
// the timezone, which each test switches first.
function makeFixture() {
  return {
    now: local(8, 19, 23, 30),
    orders: [
      order('first', local(0, 20, 10), 40), //                 the earliest order, in January
      order('early-today', local(8, 19, 0, 15), 100), //       00:15 today
      order('late-today', local(8, 19, 22, 45), 50, 'Shipped'), // 22:45 today
      order('cancelled-today', local(8, 19, 12), 999, 'Cancelled'),
      order('yesterday', local(8, 18, 12), 30),
      order('sunday', local(8, 13, 9), 20), //                 Sun 13 Sep
      order('before-7d', local(8, 12, 23, 0), 70), //          23:00 on 12 Sep: 30 minutes before the 7D window opens
    ],
  }
}

describe('revenue chart dates do not depend on the timezone', () => {
  it.each(ZONES)("$zone: today's orders, early and late, are on today's bar", (zone) => {
    inZone(zone, () => {
      const { now, orders } = makeFixture()
      const series = buildRevenueSeries(orders, '7d', now)
      expect(series.map((point) => point.label)).toEqual(['Sep 12', 'Sep 13', 'Sep 14', 'Sep 15', 'Sep 16', 'Sep 17', 'Sep 18', 'Sep 19'])
      expect(valueOn(series, 'Sep 19')).toBe(150) // 00:15 and 22:45; the cancelled order is not revenue
      expect(valueOn(series, 'Sep 18')).toBe(30)
      expect(valueOn(series, 'Sep 13')).toBe(20)
      expect(valueOn(series, 'Sep 12')).toBe(0) // the 23:00 order is before the window opens
    })
  })

  it.each(ZONES)('$zone: weekly buckets are labelled with their Monday and hold the right orders', (zone) => {
    inZone(zone, () => {
      const { now, orders } = makeFixture()
      const weeks = buildRevenueSeries(orders, '90d', now)
      expect(weeks).toHaveLength(14)
      expect(weeks[0].label).toBe('Jun 15') // Monday of the week containing 21 Jun
      expect(weeks.at(-1).label).toBe('Sep 14')
      expect(valueOn(weeks, 'Sep 14')).toBe(180) // 19 Sep (both) and 18 Sep
      expect(valueOn(weeks, 'Sep 7')).toBe(90) // Sat 12 Sep and Sun 13 Sep belong to the week of Monday 7 Sep
    })
  })

  it.each(ZONES)('$zone: every range adds up to the Overview headline revenue', (zone) => {
    inZone(zone, () => {
      const { now, orders } = makeFixture()
      const expected = { '7d': 200, '30d': 270, '90d': 270, '12m': 310 }
      Object.entries(expected).forEach(([range, revenue]) => {
        expect(computeOverviewMetrics(orders, range, now).revenue.value, `${range} metric`).toBe(revenue)
        expect(sum(buildRevenueSeries(orders, range, now)), `${range} chart`).toBe(revenue)
      })
    })
  })

  it.each(ZONES)('$zone: with the real seeded orders, the latest days hold exactly their own orders and totals match', (zone) => {
    inZone(zone, () => {
      const now = new Date()
      const daily = buildRevenueSeries(ORDERS, '7d', now)

      // Today and yesterday, in this zone: each bar must hold the paid orders placed on that local day.
      let checked = 0
      ;[0, 1].forEach((daysBack) => {
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack)
        const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack + 1)
        const onThatDay = ORDERS.filter((o) => {
          const placed = new Date(o.placedAt)
          return o.status !== 'Cancelled' && placed >= from && placed < to && placed <= now
        })
        const bar = daily.at(-1 - daysBack)
        expect(bar.label).toBe(formatDate(from, { month: 'short', day: 'numeric' }))
        expect(Math.abs(bar.value - onThatDay.reduce((total, o) => total + o.total, 0))).toBeLessThanOrEqual(0.5)
        checked += onThatDay.length
      })
      expect(checked).toBeGreaterThan(0) // the seed places orders on the latest days, so this is not vacuous

      ;['7d', '30d', '90d', '12m'].forEach((range) => {
        const series = buildRevenueSeries(ORDERS, range, now)
        const headline = computeOverviewMetrics(ORDERS, range, now).revenue.value
        // Each bucket is rounded to whole dollars, so allow half a dollar per bucket.
        expect(Math.abs(sum(series) - headline), `${range} chart vs headline`).toBeLessThanOrEqual(series.length * 0.5)
      })
    })
  })
})

describe('the 12-month range includes its earliest order', () => {
  const NOW = local(8, 19, 23, 30)

  it.each(ZONES)('$zone: the first order of the business is on the chart', (zone) => {
    inZone(zone, () => {
      const { now, orders } = makeFixture()
      const months = buildRevenueSeries(orders, '12m', now)
      // The chart starts at the month of the first order, and that order is counted.
      expect(months.map((point) => point.label)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'])
      expect(months[0].value).toBe(40)
      expect(valueOn(months, 'Sep')).toBe(270)
      expect(sum(months)).toBe(computeOverviewMetrics(orders, '12m', now).revenue.value)
    })
  })

  it('is included whether the earliest order is a moment or months after the start of the year-long window', () => {
    const justInside = [order('a', new Date(daysAgo(365, NOW).getTime() + 60 * 1000), 25), order('b', local(8, 1), 10)]
    expect(sum(buildRevenueSeries(justInside, '12m', NOW))).toBe(35)

    const recent = [order('a', local(6, 1), 25), order('b', local(8, 1), 10)]
    expect(sum(buildRevenueSeries(recent, '12m', NOW))).toBe(35)
  })

  it('still follows the window rule: an order exactly at the start of the window is out, for chart and headline alike', () => {
    const atStart = order('edge', daysAgo(365, NOW), 100)
    const orders = [atStart, order('recent', local(8, 1), 5)]
    expect(computeOverviewMetrics(orders, '12m', NOW).revenue.value).toBe(5)
    expect(sum(buildRevenueSeries(orders, '12m', NOW))).toBe(5)
  })

  it('counts the earliest order on every range whose window contains it', () => {
    const orders = [order('a', local(8, 15, 9), 40), order('b', local(8, 18, 9), 60)]
    ;['7d', '30d', '90d', '12m'].forEach((range) => {
      expect(sum(buildRevenueSeries(orders, range, NOW)), range).toBe(100)
    })
  })

  it('leaves a range with no orders as a single empty period, as before', () => {
    expect(buildRevenueSeries([], '12m', NOW)).toHaveLength(1)
    expect(sum(buildRevenueSeries([], '30d', NOW))).toBe(0)
  })
})
