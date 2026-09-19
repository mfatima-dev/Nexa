import { useMemo, useRef, useState } from 'react'
import Button from '../common/Button.jsx'
import Drawer from '../common/Drawer.jsx'
import FormField from '../common/FormField.jsx'
import { useProducts } from '../../context/useProducts.js'
import { PRODUCT_CATEGORIES } from '../../data/products.js'
import { PRODUCT_STATUSES, STATUS_LABELS, suggestSku, validateProduct } from '../../data/productRules.js'
import './ProductFormDrawer.css'

const FORM_ID = 'product-form'

function initialValues(product, products) {
  if (product) {
    return {
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: String(product.price),
      cost: String(product.cost),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      status: product.status,
    }
  }
  const category = PRODUCT_CATEGORIES[0]
  return {
    name: '',
    sku: suggestSku(category, products),
    category,
    price: '',
    cost: '',
    stock: '0',
    lowStockThreshold: '20',
    status: 'active',
  }
}

/**
 * Create (product = null) or edit a product. `onSubmit(values)` must return the provider's
 * { ok, errors } result so server-side (provider) validation errors can also be shown.
 */
function ProductFormDrawer({ product, onSubmit, onCancel }) {
  const { products } = useProducts()
  const isEdit = Boolean(product)
  const formRef = useRef(null)

  const [values, setValues] = useState(() => initialValues(product, products))
  // Fields the user has actually changed. Blur only flags these, so focus merely passing
  // through a field (including React StrictMode's dev remount) never raises an error.
  const [edited, setEdited] = useState({})
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [skuEdited, setSkuEdited] = useState(isEdit)

  const errors = useMemo(() => validateProduct(values, products, product?.id ?? null), [values, products, product])
  const visibleError = (field) => (submitted || touched[field] ? errors[field] : undefined)

  function setField(field, value) {
    setEdited((current) => ({ ...current, [field]: true }))
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleChange(field) {
    return (event) => setField(field, event.target.value)
  }

  // Untouched required fields wait for submit; edited ones are flagged as soon as the user leaves them.
  function handleBlur(field) {
    return () => {
      if (edited[field]) setTouched((current) => ({ ...current, [field]: true }))
    }
  }

  function handleCategoryChange(event) {
    const category = event.target.value
    setEdited((current) => ({ ...current, category: true }))
    setValues((current) => ({
      ...current,
      category,
      // Keep the suggested SKU in step with the category until the user types their own.
      sku: skuEdited ? current.sku : suggestSku(category, products),
    }))
  }

  function handleSkuChange(event) {
    setSkuEdited(true)
    setField('sku', event.target.value)
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)

    if (Object.keys(errors).length > 0) {
      // Send focus to the first field that needs attention.
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    const result = onSubmit(values)
    if (result && !result.ok && result.errors) {
      setTouched(Object.fromEntries(Object.keys(result.errors).map((field) => [field, true])))
    }
  }

  const title = isEdit ? `Edit ${product.name}` : 'Add product'

  return (
    <Drawer
      title={title}
      closeLabel={isEdit ? 'Close edit form' : 'Close add product form'}
      onClose={onCancel}
      initialFocusSelector='[name="name"]'
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID}>
            {isEdit ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} ref={formRef} className="product-form" onSubmit={handleSubmit} noValidate>
        <FormField label="Product name" required error={visibleError('name')}>
          <input name="name" type="text" value={values.name} onChange={handleChange('name')} onBlur={handleBlur('name')} autoComplete="off" />
        </FormField>

        <div className="product-form__row">
          <FormField label="SKU" required error={visibleError('sku')} hint="Letters, numbers and dashes.">
            <input name="sku" type="text" value={values.sku} onChange={handleSkuChange} onBlur={handleBlur('sku')} autoComplete="off" />
          </FormField>
          <FormField label="Category" required error={visibleError('category')}>
            <select name="category" value={values.category} onChange={handleCategoryChange} onBlur={handleBlur('category')}>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="product-form__row">
          <FormField
            label="Price (USD)"
            required
            error={visibleError('price')}
            hint={isEdit ? 'Existing orders keep the price they were placed at.' : undefined}
          >
            <input name="price" type="number" inputMode="decimal" min="0" step="0.01" value={values.price} onChange={handleChange('price')} onBlur={handleBlur('price')} />
          </FormField>
          <FormField label="Unit cost (USD)" required error={visibleError('cost')}>
            <input name="cost" type="number" inputMode="decimal" min="0" step="0.01" value={values.cost} onChange={handleChange('cost')} onBlur={handleBlur('cost')} />
          </FormField>
        </div>

        <div className="product-form__row">
          <FormField label="Units in stock" required error={visibleError('stock')}>
            <input name="stock" type="number" inputMode="numeric" min="0" step="1" value={values.stock} onChange={handleChange('stock')} onBlur={handleBlur('stock')} />
          </FormField>
          <FormField
            label="Low-stock threshold"
            required
            error={visibleError('lowStockThreshold')}
            hint="Flagged as low stock at or below this."
          >
            <input name="lowStockThreshold" type="number" inputMode="numeric" min="0" step="1" value={values.lowStockThreshold} onChange={handleChange('lowStockThreshold')} onBlur={handleBlur('lowStockThreshold')} />
          </FormField>
        </div>

        <FormField label="Status" required error={visibleError('status')}>
          <select name="status" value={values.status} onChange={handleChange('status')} onBlur={handleBlur('status')}>
            {PRODUCT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </FormField>
      </form>
    </Drawer>
  )
}

export default ProductFormDrawer
