import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DollarSign, PackageMinus, PackageX, Warehouse } from 'lucide-react'
import { useOrders } from '../../context/useOrders.js'
import { useProducts } from '../../context/useProducts.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import MetricCard from '../../components/common/MetricCard.jsx'
import Notice from '../../components/common/Notice.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'
import ActivityFeed from '../../components/dashboard/ActivityFeed.jsx'
import InventoryDetailsDrawer from '../../components/inventory/InventoryDetailsDrawer.jsx'
import InventoryList from '../../components/inventory/InventoryList.jsx'
import InventoryToolbar from '../../components/inventory/InventoryToolbar.jsx'
import StockAdjustDrawer from '../../components/inventory/StockAdjustDrawer.jsx'
import {
  DEFAULT_FILTERS,
  filterAndSortInventory,
  paginateInventory,
} from '../../components/inventory/inventoryQuery.js'
import {
  getInventoryStats,
  getProductMovements,
  getProductSummary,
  getRecentInventoryActivity,
} from '../../data/index.js'
import { formatCurrency } from '../../utils/format.js'
import './Inventory.css'

const PAGE_SIZE = 10

function Inventory() {
  const { orders } = useOrders()
  const { products, movements, restockProduct, adjustProductStock } = useProducts()
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  // drawer: null | { mode: 'view' | 'adjust', productId, type? }. `?product=<id>` deep-links into
  // a product's stock details (used by the "Manage stock" link on the Products page).
  const [drawer, setDrawer] = useState(() => {
    const id = searchParams.get('product')
    return id && products.some((product) => product.id === id) ? { mode: 'view', productId: id } : null
  })
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!searchParams.has('product')) return
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('product')
        return next
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  // Everything below derives from the shared products (stock), movements (history) and orders (sales).
  const stats = useMemo(() => getInventoryStats(products, orders), [products, orders])
  const summary = useMemo(() => getProductSummary(products), [products])
  const filtered = useMemo(() => filterAndSortInventory(stats, filters), [stats, filters])
  const recentActivity = useMemo(() => getRecentInventoryActivity(movements, products, 8), [movements, products])

  const {
    pageItems,
    totalPages,
    page: currentPage,
  } = useMemo(() => paginateInventory(filtered, page, PAGE_SIZE), [filtered, page])

  const selectedEntry = useMemo(
    () => (drawer ? (stats.find((entry) => entry.product.id === drawer.productId) ?? null) : null),
    [stats, drawer],
  )
  const selectedMovements = useMemo(
    () => (selectedEntry ? getProductMovements(movements, selectedEntry.product) : []),
    [movements, selectedEntry],
  )

  function handleFilterChange(patch) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function handleSubmit(type, values) {
    const { productId } = drawer
    const before = selectedEntry.product.stock
    const result =
      type === 'restock' ? restockProduct(productId, values) : adjustProductStock(productId, values)

    if (result.ok) {
      const { name, stock } = result.product
      setNotice(
        type === 'restock'
          ? `Restocked “${name}”: +${result.movement.change} units. On hand: ${stock}.`
          : `Adjusted “${name}”: on hand ${before} → ${stock}.`,
      )
      setDrawer({ mode: 'view', productId })
    }
    return result
  }

  const closeDrawer = () => setDrawer(null)
  const backToDetails = () => setDrawer({ mode: 'view', productId: drawer.productId })
  const hasProducts = products.length > 0

  return (
    <div className="inventory-page">
      <PageHeader title="Inventory" description="Track stock levels and record every stock change." />

      {notice && <Notice>{notice}</Notice>}

      <div className="inventory-page__metrics">
        <MetricCard
          label="Total Units"
          value={summary.unitsInStock.toLocaleString('en-US')}
          supportingText={`On hand across ${summary.total} products`}
          icon={Warehouse}
        />
        <MetricCard
          label="Inventory Value"
          value={formatCurrency(summary.inventoryValue)}
          supportingText="Valued at unit cost"
          icon={DollarSign}
        />
        <MetricCard
          label="Low Stock"
          value={summary.lowStock}
          supportingText="Active products at or below threshold"
          icon={PackageMinus}
        />
        <MetricCard
          label="Out of Stock"
          value={summary.outOfStock}
          supportingText="Active products with no units"
          icon={PackageX}
        />
      </div>

      {hasProducts && <InventoryToolbar filters={filters} onChange={handleFilterChange} onClear={handleClearFilters} />}

      <SectionCard title="Stock levels" subtitle={`${filtered.length} of ${products.length} products`}>
        {!hasProducts ? (
          <EmptyState
            title="No products to track"
            description="Add products on the Products page and their stock will appear here."
          />
        ) : pageItems.length > 0 ? (
          <>
            <InventoryList
              items={pageItems}
              onSelectProduct={(productId) => {
                setNotice('')
                setDrawer({ mode: 'view', productId })
              }}
            />
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No products match your filters"
            description="Try adjusting your search or filter criteria."
            actionLabel="Clear filters"
            onAction={handleClearFilters}
          />
        )}
      </SectionCard>

      <SectionCard title="Recent stock activity" subtitle="Latest restocks, adjustments and order fulfillments">
        <ActivityFeed items={recentActivity} />
      </SectionCard>

      {drawer?.mode === 'view' && (
        <InventoryDetailsDrawer
          key={drawer.productId}
          entry={selectedEntry}
          movements={selectedMovements}
          onClose={closeDrawer}
          onRestock={() => setDrawer({ mode: 'adjust', productId: drawer.productId, type: 'restock' })}
          onAdjust={() => setDrawer({ mode: 'adjust', productId: drawer.productId, type: 'adjustment' })}
        />
      )}

      {drawer?.mode === 'adjust' && selectedEntry && (
        <StockAdjustDrawer
          key={`${drawer.productId}-${drawer.type}`}
          product={selectedEntry.product}
          initialType={drawer.type}
          onSubmit={handleSubmit}
          onCancel={backToDetails}
        />
      )}
    </div>
  )
}

export default Inventory
