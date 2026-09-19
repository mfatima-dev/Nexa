import { SearchX } from 'lucide-react'
import './EmptyState.css'

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <SearchX size={20} aria-hidden="true" />
      </span>
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {actionLabel && (
        <button type="button" className="empty-state__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState
