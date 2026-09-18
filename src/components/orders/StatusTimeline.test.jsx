import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import StatusTimeline from './StatusTimeline.jsx'

const base = {
  id: 'NX-1',
  placedAt: '2026-06-01T00:00:00.000Z',
  processingAt: null,
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
}

function stepStates(order) {
  const { container } = render(<StatusTimeline order={order} />)
  return Array.from(container.querySelectorAll('.status-timeline__step')).map((el) =>
    ['done', 'current', 'upcoming', 'cancelled'].find((state) => el.classList.contains(`status-timeline__step--${state}`)),
  )
}

describe('StatusTimeline', () => {
  it('marks only the first step current for a Pending order', () => {
    expect(stepStates({ ...base, status: 'Pending' })).toEqual(['current', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('marks earlier steps done and the active one current', () => {
    expect(stepStates({ ...base, status: 'Shipped' })).toEqual(['done', 'done', 'current', 'upcoming'])
  })

  it('marks every step done for a Delivered order', () => {
    expect(stepStates({ ...base, status: 'Delivered' })).toEqual(['done', 'done', 'done', 'done'])
  })

  it('shows the placed and cancelled steps for a Cancelled order', () => {
    expect(stepStates({ ...base, status: 'Cancelled' })).toEqual(['done', 'cancelled'])
  })
})
