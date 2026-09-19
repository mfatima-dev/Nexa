import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOrders } from '../../context/useOrders.js'
import PageHeader from '../../components/common/PageHeader.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import OrdersSummary from '../../components/orders/OrdersSummary.jsx'
import OrdersToolbar from '../../components/orders/OrdersToolbar.jsx'
import OrdersList from '../../components/orders/OrdersList.jsx'
import OrderDetailsDrawer from '../../components/orders/OrderDetailsDrawer.jsx'
import { DEFAULT_FILTERS, filterAndSortOrders, paginateOrders } from '../../components/orders/ordersQuery.js'
import { getOrderStatusCounts } from '../../data/index.js'
import './Orders.css'

const PAGE_SIZE = 10

function Orders() {
  const { orders, updateOrderStatus } = useOrders()
  const [searchParams, setSearchParams] = useSearchParams()

  // `?q=` pre-fills the search box (e.g. "all orders for this customer" links);
  // `?order=` opens that order's drawer, so other pages can deep-link into it.
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, search: searchParams.get('q') ?? '' }))
  const [page, setPage] = useState(1)
  const selectedOrderId = searchParams.get('order')

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

  const selectOrder = useCallback(
    (orderId) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (orderId) next.set('order', orderId)
          else next.delete('order')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
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
            <OrdersList orders={pageItems} onSelectOrder={selectOrder} />
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No orders match your filters"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            onAction={handleClearFilters}
          />
        )}
      </SectionCard>

      <OrderDetailsDrawer
        order={selectedOrder}
        onClose={() => selectOrder(null)}
        onUpdateStatus={updateOrderStatus}
      />
    </div>
  )
}

export default Orders
