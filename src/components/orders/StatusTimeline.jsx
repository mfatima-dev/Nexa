import { Check, X } from 'lucide-react'
import { formatDate } from '../../utils/date.js'
import './StatusTimeline.css'

const STEPS = [
  { key: 'Pending', label: 'Order placed', dateField: 'placedAt' },
  { key: 'Processing', label: 'Processing', dateField: 'processingAt' },
  { key: 'Shipped', label: 'Shipped', dateField: 'shippedAt' },
  { key: 'Delivered', label: 'Delivered', dateField: 'deliveredAt' },
]

const STATUS_ORDER = STEPS.map((step) => step.key)

function formatStepDate(value) {
  return value ? formatDate(value, { month: 'short', day: 'numeric', year: 'numeric' }) : null
}

function StatusTimeline({ order }) {
  if (order.status === 'Cancelled') {
    return (
      <ol className="status-timeline">
        <li className="status-timeline__step status-timeline__step--done">
          <span className="status-timeline__dot status-timeline__dot--active">
            <Check size={12} aria-hidden="true" />
          </span>
          <div className="status-timeline__step-content">
            <span className="status-timeline__step-label">Order placed</span>
            <span className="status-timeline__step-date">{formatStepDate(order.placedAt)}</span>
          </div>
        </li>
        <li className="status-timeline__step status-timeline__step--cancelled">
          <span className="status-timeline__dot status-timeline__dot--cancelled">
            <X size={12} aria-hidden="true" />
          </span>
          <div className="status-timeline__step-content">
            <span className="status-timeline__step-label">Order cancelled</span>
            {order.cancelledAt && (
              <span className="status-timeline__step-date">{formatStepDate(order.cancelledAt)}</span>
            )}
          </div>
        </li>
      </ol>
    )
  }

  const currentIndex = STATUS_ORDER.indexOf(order.status)
  // Delivered is terminal: every step, including the last, is complete.
  const isComplete = order.status === 'Delivered'

  return (
    <ol className="status-timeline">
      {STEPS.map((step, index) => {
        const state =
          isComplete || index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
        const isFinal = step.key === 'Delivered'
        const dotModifier = state === 'upcoming' ? 'upcoming' : isFinal && state === 'done' ? 'success' : 'active'

        return (
          <li key={step.key} className={`status-timeline__step status-timeline__step--${state}`}>
            <span className={`status-timeline__dot status-timeline__dot--${dotModifier}`}>
              {state === 'done' && <Check size={12} aria-hidden="true" />}
            </span>
            <div className="status-timeline__step-content">
              <span className="status-timeline__step-label">{step.label}</span>
              {state !== 'upcoming' && order[step.dateField] && (
                <span className="status-timeline__step-date">{formatStepDate(order[step.dateField])}</span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default StatusTimeline
