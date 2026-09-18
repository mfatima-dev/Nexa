import { describe, expect, it } from 'vitest'
import { applyStatusChange, canCancelOrder, getNextStatus, isValidTransition } from './orderStatus.js'

describe('getNextStatus', () => {
  it('returns the next forward status for each stage', () => {
    expect(getNextStatus('Pending')).toBe('Processing')
    expect(getNextStatus('Processing')).toBe('Shipped')
    expect(getNextStatus('Shipped')).toBe('Delivered')
  })

  it('returns null for terminal statuses', () => {
    expect(getNextStatus('Delivered')).toBeNull()
    expect(getNextStatus('Cancelled')).toBeNull()
  })
})

describe('canCancelOrder', () => {
  it('allows cancelling before anything has shipped', () => {
    expect(canCancelOrder('Pending')).toBe(true)
    expect(canCancelOrder('Processing')).toBe(true)
  })

  it('disallows cancelling once shipped or resolved', () => {
    expect(canCancelOrder('Shipped')).toBe(false)
    expect(canCancelOrder('Delivered')).toBe(false)
    expect(canCancelOrder('Cancelled')).toBe(false)
  })
})

describe('isValidTransition', () => {
  it('allows each forward step', () => {
    expect(isValidTransition('Pending', 'Processing')).toBe(true)
    expect(isValidTransition('Processing', 'Shipped')).toBe(true)
    expect(isValidTransition('Shipped', 'Delivered')).toBe(true)
  })

  it('allows cancellation from cancellable states', () => {
    expect(isValidTransition('Pending', 'Cancelled')).toBe(true)
    expect(isValidTransition('Processing', 'Cancelled')).toBe(true)
  })

  it('rejects cancellation once shipped or delivered', () => {
    expect(isValidTransition('Shipped', 'Cancelled')).toBe(false)
    expect(isValidTransition('Delivered', 'Cancelled')).toBe(false)
  })

  it('rejects skipping a step', () => {
    expect(isValidTransition('Pending', 'Shipped')).toBe(false)
    expect(isValidTransition('Pending', 'Delivered')).toBe(false)
  })

  it('rejects backwards transitions', () => {
    expect(isValidTransition('Delivered', 'Pending')).toBe(false)
    expect(isValidTransition('Shipped', 'Processing')).toBe(false)
  })

  it('rejects any transition from a terminal state', () => {
    expect(isValidTransition('Delivered', 'Processing')).toBe(false)
    expect(isValidTransition('Cancelled', 'Processing')).toBe(false)
  })
})

describe('applyStatusChange', () => {
  const now = new Date('2026-06-15T12:00:00.000Z')

  it('stamps the matching timestamp field for each status', () => {
    const order = { id: 'NX-1', status: 'Pending', placedAt: '2026-06-01T00:00:00.000Z' }

    expect(applyStatusChange(order, 'Processing', now).processingAt).toBe(now.toISOString())
    expect(applyStatusChange(order, 'Shipped', now).shippedAt).toBe(now.toISOString())
    expect(applyStatusChange(order, 'Delivered', now).deliveredAt).toBe(now.toISOString())
    expect(applyStatusChange(order, 'Cancelled', now).cancelledAt).toBe(now.toISOString())
  })

  it('does not overwrite an existing timestamp', () => {
    const order = { id: 'NX-1', status: 'Processing', shippedAt: '2026-06-05T00:00:00.000Z' }
    const updated = applyStatusChange(order, 'Shipped', now)
    expect(updated.shippedAt).toBe('2026-06-05T00:00:00.000Z')
  })

  it('does not mutate the original order', () => {
    const order = { id: 'NX-1', status: 'Pending' }
    applyStatusChange(order, 'Processing', now)
    expect(order.status).toBe('Pending')
  })
})
