import { ArrowUpDown, Bell, PackageCheck, PackageMinus, PackagePlus, RefreshCw, ShoppingCart, Truck, XCircle } from 'lucide-react'
import { formatRelativeTime } from '../../utils/date.js'
import './ActivityFeed.css'

const ICONS = {
  order_placed: ShoppingCart,
  order_processing: RefreshCw,
  order_shipped: Truck,
  order_delivered: PackageCheck,
  order_cancelled: XCircle,
  inventory_restocked: PackagePlus,
  inventory_adjusted: ArrowUpDown,
  inventory_fulfilled: PackageMinus,
}

function ActivityFeed({ items }) {
  if (!items.length) {
    return <p className="activity-feed__empty">No recent activity.</p>
  }

  return (
    <ul className="activity-feed">
      {items.map((item) => {
        const Icon = ICONS[item.type] ?? Bell
        return (
          <li key={item.id} className="activity-feed__item">
            <span className={`activity-feed__icon activity-feed__icon--${item.type}`}>
              <Icon size={14} aria-hidden="true" />
            </span>
            <div className="activity-feed__content">
              <p className="activity-feed__message">{item.message}</p>
              <span className="activity-feed__time">{formatRelativeTime(item.occurredAt)}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default ActivityFeed
