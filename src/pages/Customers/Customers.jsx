import { useMemo, useState } from 'react'
import { DollarSign, UserCheck, Users, Wallet } from 'lucide-react'
import { useCustomers } from '../../context/useCustomers.js'
import { useOrders } from '../../context/useOrders.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'
import MetricCard from '../../components/common/MetricCard.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import CustomersToolbar from '../../components/customers/CustomersToolbar.jsx'
import CustomersList from '../../components/customers/CustomersList.jsx'
import CustomerDetailsDrawer from '../../components/customers/CustomerDetailsDrawer.jsx'
import {
  DEFAULT_FILTERS,
  filterAndSortCustomers,
  paginateCustomers,
} from '../../components/customers/customersQuery.js'
import {
  ACTIVE_CUSTOMER_WINDOW_DAYS,
  getCustomerOrders,
  getCustomerStats,
  getCustomerSummary,
} from '../../data/index.js'
import { formatCurrency } from '../../utils/format.js'
import './Customers.css'

const PAGE_SIZE = 10

function Customers() {
  const { orders } = useOrders()
  const { customers } = useCustomers()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)

  // A customer created since the seed (e.g. from a future Storefront checkout) shows up here too.
  const stats = useMemo(() => getCustomerStats(orders, undefined, customers), [orders, customers])
  const summary = useMemo(() => getCustomerSummary(stats), [stats])
  const filteredCustomers = useMemo(() => filterAndSortCustomers(stats, filters), [stats, filters])

  const {
    pageItems,
    totalPages,
    page: currentPage,
  } = useMemo(() => paginateCustomers(filteredCustomers, page, PAGE_SIZE), [filteredCustomers, page])

  const selectedEntry = useMemo(
    () => stats.find((entry) => entry.customer.id === selectedCustomerId) ?? null,
    [stats, selectedCustomerId],
  )
  const selectedOrders = useMemo(
    () => (selectedCustomerId ? getCustomerOrders(orders, selectedCustomerId) : []),
    [orders, selectedCustomerId],
  )

  function handleFilterChange(patch) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  return (
    <div className="customers-page">
      <PageHeader title="Customers" description="Manage customer relationships and purchase history." />

      <div className="customers-page__metrics">
        <MetricCard
          label="Total Customers"
          value={summary.totalCustomers}
          supportingText={`${summary.customersWithOrders} have placed an order`}
          icon={Users}
        />
        <MetricCard
          label="Active Customers"
          value={summary.activeCustomers}
          supportingText={`Ordered in the last ${ACTIVE_CUSTOMER_WINDOW_DAYS} days`}
          icon={UserCheck}
        />
        <MetricCard
          label="Customer Revenue"
          value={formatCurrency(summary.totalRevenue)}
          supportingText="Excludes cancelled orders"
          icon={DollarSign}
        />
        <MetricCard
          label="Avg. Customer Value"
          value={formatCurrency(summary.averageCustomerValue)}
          supportingText="Per purchasing customer"
          icon={Wallet}
        />
      </div>

      <CustomersToolbar filters={filters} onChange={handleFilterChange} onClear={handleClearFilters} />

      <SectionCard title="Customers" subtitle={`${filteredCustomers.length} of ${stats.length} customers`}>
        {pageItems.length > 0 ? (
          <>
            <CustomersList customers={pageItems} onSelectCustomer={setSelectedCustomerId} />
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No customers match your filters"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            onAction={handleClearFilters}
          />
        )}
      </SectionCard>

      <CustomerDetailsDrawer
        entry={selectedEntry}
        orders={selectedOrders}
        onClose={() => setSelectedCustomerId(null)}
      />
    </div>
  )
}

export default Customers
