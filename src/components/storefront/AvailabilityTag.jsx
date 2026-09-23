import { getAvailabilityState } from './availabilityState.js'

function AvailabilityTag({ available, className = '' }) {
  const state = getAvailabilityState(available)
  if (state === 'in') return null

  const label = state === 'out' ? 'Sold out' : `Only ${available} left`
  return <span className={`sf-availability sf-availability--${state} ${className}`.trim()}>{label}</span>
}

export default AvailabilityTag
