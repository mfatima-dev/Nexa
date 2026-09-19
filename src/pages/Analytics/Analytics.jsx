import { useMemo, useState } from 'react'
import { Boxes, DollarSign, Receipt, ShoppingCart, UserPlus } from 'lucide-react'
import { useOrders } from '../../context/useOrders.js'
import { useProducts } from '../../context/useProducts.js'
import CategoryPerformance from '../../components/analytics/CategoryPerformance.jsx'
import CustomerGrowthChart from '../../components/analytics/CustomerGrowthChart.jsx'
import InsightsPanel from '../../components/analytics/InsightsPanel.jsx'
import OrdersChart from '../../components/analytics/OrdersChart.jsx'
import ProductPerformance from '../../components/analytics/ProductPerformance.jsx'
import DateRangeControl from '../../components/common/DateRangeControl.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import MetricCard from '../../components/common/MetricCard.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'
import RevenueChart from '../../components/dashboard/RevenueChart.jsx'
import { RANGE_OPTIONS, getAnalyticsReport } from '../../data/index.js'
import { formatCompactNumber, formatCurrency } from '../../utils/format.js'
import './Analytics.css'

function Analytics() {
  const { orders } = useOrders()
  const { products } = useProducts()
  const [range, setRange] = useState('30d')

  const report = useMemo(() => getAnalyticsReport(orders, products, range), [orders, products, range])
  const { metrics, series, topProducts, categories, insights, period } = report

  const revenueSeries = useMemo(() => series.map((point) => ({ label: point.label, value: point.revenue })), [series])
  const hasOrders = metrics.orders.value > 0
  const unit = period.granularity
  const previousRevenue = metrics.revenue.previous
  const previousLabel = period.previousTitle.charAt(0).toUpperCase() + period.previousTitle.slice(1)

  return (
    <div className="analytics">
      <PageHeader
        title="Analytics"
        description={`Performance for the ${period.title.toLowerCase()} (${period.periodLabel})`}
        actions={<DateRangeControl options={RANGE_OPTIONS} value={range} onChange={setRange} />}
      />

      <div className="analytics__metrics">
        <MetricCard
          label="Revenue"
          value={formatCurrency(metrics.revenue.value)}
          changePct={metrics.revenue.changePct}
          icon={DollarSign}
        />
        <MetricCard
          label="Orders"
          value={formatCompactNumber(metrics.orders.value)}
          changePct={metrics.orders.changePct}
          icon={ShoppingCart}
        />
        <MetricCard
          label="Average Order Value"
          value={formatCurrency(metrics.averageOrderValue.value, { decimals: 2 })}
          changePct={metrics.averageOrderValue.changePct}
          icon={Receipt}
        />
        <MetricCard
          label="Units Sold"
          value={formatCompactNumber(metrics.unitsSold.value)}
          changePct={metrics.unitsSold.changePct}
          icon={Boxes}
        />
        <MetricCard
          label="Customer Growth"
          value={`+${formatCompactNumber(metrics.customers.newCustomers)}`}
          changePct={metrics.customers.changePct}
          icon={UserPlus}
        />
      </div>

      <p className="analytics__note">
        Revenue, average order value, products and categories count paid orders only. Units sold counts only orders that
        have shipped. Orders counts every order placed, including {metrics.orders.cancelled} cancelled in this period.
      </p>

      <SectionCard
        title="Highlights"
        subtitle={`What changed in the ${period.title.toLowerCase()} and what needs attention`}
        className="analytics__highlights"
      >
        <InsightsPanel insights={insights} />
      </SectionCard>

      <SectionCard
        title="Revenue over time"
        subtitle={`Revenue by ${unit}, cancelled orders excluded`}
        actions={
          previousRevenue !== null && (
            <span className="analytics__compare">
              {previousLabel}: {formatCurrency(previousRevenue)}
            </span>
          )
        }
        className="analytics__revenue"
      >
        {hasOrders ? (
          <div role="img" aria-label={`Revenue by ${unit}: ${formatCurrency(metrics.revenue.value)} in total`}>
            <RevenueChart data={revenueSeries} />
          </div>
        ) : (
          <EmptyState title="No orders in this period" description="Try a longer date range." />
        )}
      </SectionCard>

      <div className="analytics__row">
        <SectionCard title="Orders over time" subtitle={`Orders placed by ${unit}, with cancellations shown separately`}>
          {hasOrders ? (
            <div
              role="img"
              aria-label={`Orders by ${unit}: ${metrics.orders.value} placed, ${metrics.orders.cancelled} cancelled`}
            >
              <OrdersChart data={series} />
            </div>
          ) : (
            <EmptyState title="No orders in this period" description="Try a longer date range." />
          )}
        </SectionCard>

        <SectionCard
          title="Customer growth"
          subtitle={`${metrics.customers.total} customers in total · ${metrics.customers.newCustomers} new in this period`}
        >
          <div
            role="img"
            aria-label={`Customers by ${unit}: ${metrics.customers.total} in total, ${metrics.customers.newCustomers} new`}
          >
            <CustomerGrowthChart data={series} />
          </div>
        </SectionCard>
      </div>

      <div className="analytics__row">
        <SectionCard title="Top products" subtitle="Best sellers by revenue, with their current stock">
          <ProductPerformance items={topProducts} />
        </SectionCard>

        <SectionCard title="Category performance" subtitle="Revenue by product category">
          <CategoryPerformance rows={categories} />
        </SectionCard>
      </div>
    </div>
  )
}

export default Analytics
