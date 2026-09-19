import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Percent, PackageMinus, Plus, Warehouse } from 'lucide-react'
import { useOrders } from '../../context/useOrders.js'
import { useProducts } from '../../context/useProducts.js'
import Button from '../../components/common/Button.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import MetricCard from '../../components/common/MetricCard.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import SectionCard from '../../components/common/SectionCard.jsx'
import ProductDetailsDrawer from '../../components/products/ProductDetailsDrawer.jsx'
import ProductFormDrawer from '../../components/products/ProductFormDrawer.jsx'
import ProductsList from '../../components/products/ProductsList.jsx'
import ProductsToolbar from '../../components/products/ProductsToolbar.jsx'
import {
  DEFAULT_FILTERS,
  filterAndSortProducts,
  paginateProducts,
} from '../../components/products/productsQuery.js'
import { getProductStats, getProductSummary } from '../../data/index.js'
import { formatCurrency } from '../../utils/format.js'
import './Products.css'

const PAGE_SIZE = 10

function Products() {
  const { orders } = useOrders()
  const { products, addProduct, updateProduct, deleteProduct } = useProducts()
  const [searchParams, setSearchParams] = useSearchParams()
  const addButtonRef = useRef(null)

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  // drawer: null | { mode: 'view' | 'edit' | 'create', productId? }. `?product=<id>` deep-links
  // into a product's details (used by Overview's Top Products).
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

  const stats = useMemo(() => getProductStats(products, orders), [products, orders])
  const summary = useMemo(() => getProductSummary(products), [products])
  const filtered = useMemo(() => filterAndSortProducts(stats, filters), [stats, filters])

  const {
    pageItems,
    totalPages,
    page: currentPage,
  } = useMemo(() => paginateProducts(filtered, page, PAGE_SIZE), [filtered, page])

  const selectedEntry = useMemo(
    () => (drawer?.productId ? (stats.find((entry) => entry.product.id === drawer.productId) ?? null) : null),
    [stats, drawer],
  )

  function handleFilterChange(patch) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function handleSubmit(values) {
    if (drawer.mode === 'create') {
      const result = addProduct(values)
      if (result.ok) {
        setDrawer({ mode: 'view', productId: result.product.id })
        setNotice(`Added “${result.product.name}”.`)
      }
      return result
    }

    const result = updateProduct(drawer.productId, values)
    if (result.ok) {
      setDrawer({ mode: 'view', productId: drawer.productId })
      setNotice(`Saved changes to “${result.product.name}”.`)
    }
    return result
  }

  function handleDelete() {
    const name = selectedEntry.product.name
    deleteProduct(drawer.productId)
    setDrawer(null)
    setNotice(`Deleted “${name}”.`)
    // The row that opened the drawer is gone, so put focus somewhere sensible.
    requestAnimationFrame(() => addButtonRef.current?.focus())
  }

  const closeDrawer = () => setDrawer(null)
  const hasProducts = products.length > 0

  return (
    <div className="products-page">
      <PageHeader
        title="Products"
        description="Manage your catalog, pricing and stock levels."
        actions={
          <Button
            ref={addButtonRef}
            variant="primary"
            icon={Plus}
            onClick={() => {
              setNotice('')
              setDrawer({ mode: 'create' })
            }}
          >
            Add product
          </Button>
        }
      />

      {notice && (
        <p className="products-page__notice" role="status">
          {notice}
        </p>
      )}

      <div className="products-page__metrics">
        <MetricCard
          label="Total Products"
          value={summary.total}
          supportingText={`${summary.active} active · ${summary.discontinued} discontinued`}
          icon={Package}
        />
        <MetricCard
          label="Inventory Value"
          value={formatCurrency(summary.inventoryValue)}
          supportingText={`${summary.unitsInStock.toLocaleString('en-US')} units at cost`}
          icon={Warehouse}
        />
        <MetricCard
          label="Needs Restock"
          value={summary.lowStock + summary.outOfStock}
          supportingText={`${summary.lowStock} low · ${summary.outOfStock} out of stock`}
          icon={PackageMinus}
        />
        <MetricCard
          label="Avg. Margin"
          value={`${(summary.averageMargin * 100).toFixed(1)}%`}
          supportingText="Across active products"
          icon={Percent}
        />
      </div>

      {hasProducts && <ProductsToolbar filters={filters} onChange={handleFilterChange} onClear={handleClearFilters} />}

      <SectionCard title="Products" subtitle={`${filtered.length} of ${products.length} products`}>
        {!hasProducts ? (
          <EmptyState
            title="No products yet"
            description="Add your first product to start building the catalog."
            actionLabel="Add product"
            onAction={() => setDrawer({ mode: 'create' })}
          />
        ) : pageItems.length > 0 ? (
          <>
            <ProductsList
              products={pageItems}
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

      {drawer?.mode === 'view' && (
        <ProductDetailsDrawer
          key={drawer.productId}
          entry={selectedEntry}
          onClose={closeDrawer}
          onEdit={() => setDrawer({ mode: 'edit', productId: drawer.productId })}
          onDelete={handleDelete}
        />
      )}

      {drawer?.mode === 'edit' && selectedEntry && (
        <ProductFormDrawer
          product={selectedEntry.product}
          onSubmit={handleSubmit}
          onCancel={() => setDrawer({ mode: 'view', productId: drawer.productId })}
        />
      )}

      {drawer?.mode === 'create' && <ProductFormDrawer product={null} onSubmit={handleSubmit} onCancel={closeDrawer} />}
    </div>
  )
}

export default Products
