import { Link } from 'react-router-dom'
import { ArrowUpDown, Ban, ChartPie, Info, Minus, Trophy, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import './InsightsPanel.css'

const ICONS = {
  'category-leader': Trophy,
  'category-mover': ArrowUpDown,
  concentration: ChartPie,
  cancellations: Ban,
  'stock-risk': TriangleAlert,
  'no-orders': Info,
}

function iconFor(insight) {
  if (insight.id === 'revenue-trend') {
    if (insight.tone === 'positive') return TrendingUp
    if (insight.tone === 'negative') return TrendingDown
    return Minus
  }
  return ICONS[insight.id] ?? Info
}

/** Plain-language takeaways for the selected range. `insights` come from getAnalyticsInsights. */
function InsightsPanel({ insights }) {
  return (
    <ul className="insights">
      {insights.map((insight) => {
        const Icon = iconFor(insight)
        return (
          <li key={insight.id} className={`insights__item insights__item--${insight.tone}`}>
            <span className="insights__icon">
              <Icon size={16} aria-hidden="true" />
            </span>
            <div className="insights__body">
              <p className="insights__text">{insight.text}</p>
              {insight.link && (
                <Link to={insight.link.to} className="insights__link">
                  {insight.link.label}
                </Link>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default InsightsPanel
