import { useMemo, useState } from 'react'
import { useOrders } from '../../context/useOrders.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'
import OrdersSummary from '../../components/orders/OrdersSummary.jsx'
import OrdersToolbar from '../../components/orders/OrdersToolbar.jsx'
import OrdersList from '../../components/orders/OrdersList.jsx'
import OrdersPagination from '../../components/orders/OrdersPagination.jsx'
import OrdersEmptyState from '../../components/orders/OrdersEmptyState.jsx'
import OrderDetailsDrawer from '../../components/orders/OrderDetailsDrawer.jsx'
import { DEFAULT_FILTERS, filterAndSortOrders, paginateOrders } from '../../components/orders/ordersQuery.js'
import { getOrderStatusCounts } from '../../data/index.js'
import './Orders.css'

const PAGE_SIZE = 10

function Orders() {
  const { orders, updateOrderStatus } = useOrders()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const statusCounts = useMemo(() => getOrderStatusCounts(orders), [orders])
  const filteredOrders = useMemo(() => filterAndSortOrders(orders, filters), [orders, filters])

  const {
    pageItems,
    totalPages,
    page: currentPage,
  } = useMemo(() => paginateOrders(filteredOrders, page, PAGE_SIZE), [filteredOrders, page])

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
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
    <div className="orders-page">
      <PageHeader title="Orders" description="Manage and track customer orders." />

      <OrdersSummary
        counts={statusCounts}
        activeStatus={filters.status}
        onSelectStatus={(status) => handleFilterChange({ status })}
      />

      <OrdersToolbar filters={filters} onChange={handleFilterChange} onClear={handleClearFilters} />

      <SectionCard title="Orders" subtitle={`${filteredOrders.length} of ${orders.length} orders`}>
        {pageItems.length > 0 ? (
          <>
            <OrdersList orders={pageItems} onSelectOrder={setSelectedOrderId} />
            <OrdersPagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <OrdersEmptyState onClear={handleClearFilters} />
        )}
      </SectionCard>

      <OrderDetailsDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onUpdateStatus={updateOrderStatus}
      />
    </div>
  )
}

export default Orders
