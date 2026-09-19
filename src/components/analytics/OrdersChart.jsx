import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './AnalyticsCharts.css'

function OrdersTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  return (
    <div className="analytics-chart__tooltip">
      <p className="analytics-chart__tooltip-label">{point.tooltipLabel}</p>
      <p className="analytics-chart__tooltip-row">
        <span className="analytics-chart__dot analytics-chart__dot--accent" aria-hidden="true" />
        {point.activeOrders} {point.activeOrders === 1 ? 'order' : 'orders'}
      </p>
      {point.cancelled > 0 && (
        <p className="analytics-chart__tooltip-row">
          <span className="analytics-chart__dot analytics-chart__dot--danger" aria-hidden="true" />
          {point.cancelled} cancelled
        </p>
      )}
    </div>
  )
}

/** Orders placed per period. Cancelled orders are stacked on top so the total matches the Orders count. */
function OrdersChart({ data }) {
  return (
    <div className="analytics-chart">
      <ul className="analytics-chart__legend" aria-hidden="true">
        <li>
          <span className="analytics-chart__dot analytics-chart__dot--accent" />
          Orders
        </li>
        <li>
          <span className="analytics-chart__dot analytics-chart__dot--danger" />
          Cancelled
        </li>
      </ul>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--color-text-subtle)"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="var(--color-text-subtle)"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip content={<OrdersTooltip />} cursor={{ fill: 'var(--color-surface-raised)' }} />
          <Bar dataKey="activeOrders" stackId="orders" fill="var(--color-accent)" maxBarSize={28} />
          <Bar dataKey="cancelled" stackId="orders" fill="var(--color-danger)" maxBarSize={28} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default OrdersChart
