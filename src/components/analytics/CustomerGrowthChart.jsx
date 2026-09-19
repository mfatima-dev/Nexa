import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './AnalyticsCharts.css'

function CustomerTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  return (
    <div className="analytics-chart__tooltip">
      <p className="analytics-chart__tooltip-label">{point.tooltipLabel}</p>
      <p className="analytics-chart__tooltip-row">
        <span className="analytics-chart__dot analytics-chart__dot--success" aria-hidden="true" />
        {point.totalCustomers} {point.totalCustomers === 1 ? 'customer' : 'customers'}
      </p>
      {point.newCustomers > 0 && <p className="analytics-chart__tooltip-row">+{point.newCustomers} new</p>}
    </div>
  )
}

/** Running total of customers over the range. */
function CustomerGrowthChart({ data }) {
  return (
    <div className="analytics-chart">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="customerFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
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
            width={32}
            allowDecimals={false}
            domain={[(min) => Math.max(0, min - 1), (max) => max + 1]}
          />
          <Tooltip content={<CustomerTooltip />} cursor={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }} />
          <Area
            type="stepAfter"
            dataKey="totalCustomers"
            stroke="var(--color-success)"
            strokeWidth={2}
            fill="url(#customerFill)"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--color-success)', stroke: 'var(--color-bg)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CustomerGrowthChart
