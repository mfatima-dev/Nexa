import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp } from 'lucide-react'
import './MetricCard.css'

function MetricCard({ label, value, changePct, supportingText, icon: Icon, to }) {
  const showTrend = !supportingText && typeof changePct === 'number' && Number.isFinite(changePct)
  const isPositive = showTrend && changePct >= 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  const changeRow = supportingText ? (
    <div className="metric-card__change metric-card__change--neutral">
      <span>{supportingText}</span>
    </div>
  ) : showTrend ? (
    <div
      className={`metric-card__change ${
        isPositive ? 'metric-card__change--positive' : 'metric-card__change--negative'
      }`}
    >
      <TrendIcon size={14} aria-hidden="true" />
      <span>{Math.abs(changePct).toFixed(1)}% vs prior period</span>
    </div>
  ) : (
    <div className="metric-card__change metric-card__change--neutral">
      <span>No prior-period data</span>
    </div>
  )

  const content = (
    <>
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>
        {Icon && (
          <span className="metric-card__icon">
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="metric-card__value">{value}</div>
      {changeRow}
    </>
  )

  if (to) {
    return (
      <Link to={to} className="metric-card metric-card--interactive">
        {content}
      </Link>
    )
  }

  return <div className="metric-card">{content}</div>
}

export default MetricCard
