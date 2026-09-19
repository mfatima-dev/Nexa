import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCompactCurrency, formatCurrency } from '../../utils/format.js'
import './RevenueChart.css'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="revenue-chart__tooltip">
      <p className="revenue-chart__tooltip-label">{label}</p>
      <p className="revenue-chart__tooltip-value">
        <span className="revenue-chart__tooltip-dot" aria-hidden="true" />
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

function RevenueChart({ data }) {
  return (
    <div className="revenue-chart">
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            width={56}
            tickFormatter={formatCompactCurrency}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--color-accent)', stroke: 'var(--color-bg)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default RevenueChart
