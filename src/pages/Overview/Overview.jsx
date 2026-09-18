import { useMemo, useState } from 'react'
import { DollarSign, Package, ShoppingCart, Users } from 'lucide-react'
import { useOrders } from '../../context/useOrders.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import DateRangeControl from '../../components/common/DateRangeControl.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'
import MetricCard from '../../components/common/MetricCard.jsx'
import RevenueChart from '../../components/dashboard/RevenueChart.jsx'
import TopProductsList from '../../components/dashboard/TopProductsList.jsx'
import RecentOrdersTable from '../../components/dashboard/RecentOrdersTable.jsx'
import ActivityFeed from '../../components/dashboard/ActivityFeed.jsx'
import {
  RANGE_OPTIONS,
  computeOverviewMetrics,
  getProductCatalogSummary,
  buildRevenueSeries,
  getTopProducts,
  getRecentOrders,
  getRecentActivity,
} from '../../data/index.js'
import { formatCurrency, formatCompactNumber } from '../../utils/format.js'
import './Overview.css'

function Overview() {
  const { orders } = useOrders()
  const [range, setRange] = useState('30d')

  const metrics = useMemo(() => computeOverviewMetrics(orders, range), [orders, range])
  const revenueSeries = useMemo(() => buildRevenueSeries(orders, range), [orders, range])
  const catalogSummary = useMemo(() => getProductCatalogSummary(), [])
  const topProducts = useMemo(() => getTopProducts(orders, 5), [orders])
  const recentOrders = useMemo(() => getRecentOrders(orders, 6), [orders])
  const recentActivity = useMemo(() => getRecentActivity(orders, 8), [orders])

  return (
    <div className="overview">
      <PageHeader
        title="Overview"
        description="Monitor your business performance and recent activity."
        actions={<DateRangeControl options={RANGE_OPTIONS} value={range} onChange={setRange} />}
      />

      <div className="overview__metrics">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(metrics.revenue.value)}
          changePct={metrics.revenue.changePct}
          icon={DollarSign}
          to="/analytics"
        />
        <MetricCard
          label="Orders"
          value={formatCompactNumber(metrics.orders.value)}
          changePct={metrics.orders.changePct}
          icon={ShoppingCart}
          to="/orders"
        />
        <MetricCard
          label="Customers"
          value={formatCompactNumber(metrics.customers.value)}
          changePct={metrics.customers.changePct}
          icon={Users}
          to="/customers"
        />
        <MetricCard
          label="Products"
          value={formatCompactNumber(catalogSummary.total)}
          supportingText={`${catalogSummary.active} active · ${catalogSummary.discontinued} discontinued`}
          icon={Package}
        />
      </div>

      <SectionCard
        title="Revenue Overview"
        subtitle="Revenue trend for the selected period"
        className="overview__chart-section"
      >
        <RevenueChart data={revenueSeries} />
      </SectionCard>

      <div className="overview__secondary-row">
        <SectionCard title="Top Products" subtitle="Best performers by revenue">
          <TopProductsList items={topProducts} />
        </SectionCard>
        <SectionCard title="Recent Orders" subtitle="Latest orders across all customers">
          <RecentOrdersTable orders={recentOrders} />
        </SectionCard>
      </div>

      <SectionCard
        title="Recent Activity"
        subtitle="Latest events across your business"
        className="overview__activity-section"
      >
        <ActivityFeed items={recentActivity} />
      </SectionCard>
    </div>
  )
}

export default Overview
