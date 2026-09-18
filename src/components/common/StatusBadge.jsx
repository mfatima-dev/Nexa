import './StatusBadge.css'

const STATUS_STYLES = {
  Pending: 'status-badge--warning',
  Processing: 'status-badge--accent',
  Shipped: 'status-badge--accent',
  Delivered: 'status-badge--success',
  Cancelled: 'status-badge--danger',
}

function StatusBadge({ status }) {
  const styleClass = STATUS_STYLES[status] ?? 'status-badge--neutral'
  return <span className={`status-badge ${styleClass}`}>{status}</span>
}

export default StatusBadge
