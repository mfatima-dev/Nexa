import { useMemo, useRef, useState } from 'react'
import Button from '../common/Button.jsx'
import Drawer from '../common/Drawer.jsx'
import FormField from '../common/FormField.jsx'
import { ADJUSTMENT_REASONS, validateAdjustment, validateRestock } from '../../data/inventoryRules.js'
import './StockAdjustDrawer.css'

const FORM_ID = 'stock-form'

const TYPES = [
  { value: 'restock', label: 'Restock', hint: 'Receive new units into stock' },
  { value: 'adjustment', label: 'Adjustment', hint: 'Correct the on-hand count' },
]

/**
 * Restock (units received) or adjustment (set a corrected count) for one product.
 * `onSubmit(type, values)` must return the provider's { ok, errors } result.
 */
function StockAdjustDrawer({ product, initialType = 'restock', onSubmit, onCancel }) {
  const formRef = useRef(null)
  const [type, setType] = useState(initialType)
  const [values, setValues] = useState({
    quantity: '',
    newQuantity: String(product.stock),
    reason: ADJUSTMENT_REASONS[0],
    note: '',
  })
  const [edited, setEdited] = useState({})
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  // Errors only the provider can know about (e.g. stock can’t go below the units committed to open orders).
  // They are shown when the local checks have nothing to say, and go away as soon as the field is edited.
  const [providerErrors, setProviderErrors] = useState({})

  const errors = useMemo(
    () =>
      type === 'restock'
        ? validateRestock(values, product.stock)
        : validateAdjustment(values, product.stock),
    [type, values, product.stock],
  )
  const visibleError = (field) => (submitted || touched[field] ? (errors[field] ?? providerErrors[field]) : undefined)

  function handleChange(field) {
    return (event) => {
      setEdited((current) => ({ ...current, [field]: true }))
      setProviderErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)))
      setValues((current) => ({ ...current, [field]: event.target.value }))
    }
  }

  // Untouched fields wait for submit; edited ones are flagged as soon as the user leaves them.
  function handleBlur(field) {
    return () => {
      if (edited[field]) setTouched((current) => ({ ...current, [field]: true }))
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)

    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    const result = onSubmit(type, values)
    if (result && !result.ok && result.errors) {
      setTouched(Object.fromEntries(Object.keys(result.errors).map((field) => [field, true])))
      setProviderErrors(result.errors)
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
    }
  }

  const restockAmount = Number(values.quantity)
  const adjustedTo = Number(values.newQuantity)
  const preview =
    type === 'restock'
      ? Number.isInteger(restockAmount) && restockAmount > 0
        ? `On hand will go from ${product.stock} to ${product.stock + restockAmount}.`
        : null
      : Number.isInteger(adjustedTo) && adjustedTo >= 0 && adjustedTo !== product.stock
        ? `On hand will go from ${product.stock} to ${adjustedTo} (${adjustedTo > product.stock ? '+' : '−'}${Math.abs(adjustedTo - product.stock)}).`
        : null

  return (
    <Drawer
      title={`Update stock: ${product.name}`}
      closeLabel="Close stock form"
      onClose={onCancel}
      initialFocusSelector='[name="quantity"], [name="newQuantity"]'
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID}>
            {type === 'restock' ? 'Record restock' : 'Record adjustment'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} ref={formRef} className="stock-form" onSubmit={handleSubmit} noValidate>
        <p className="stock-form__current">
          Currently <strong>{product.stock}</strong> {product.stock === 1 ? 'unit' : 'units'} on hand
          <span className="stock-form__sku"> · {product.sku}</span>
        </p>

        <fieldset className="stock-form__types">
          <legend>Type of change</legend>
          {TYPES.map((option) => (
            <label key={option.value} className={`stock-form__type${type === option.value ? ' stock-form__type--active' : ''}`}>
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
              />
              <span className="stock-form__type-label">{option.label}</span>
              <span className="stock-form__type-hint">{option.hint}</span>
            </label>
          ))}
        </fieldset>

        {type === 'restock' ? (
          <FormField label="Units received" required error={visibleError('quantity')}>
            <input
              name="quantity"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={values.quantity}
              onChange={handleChange('quantity')}
              onBlur={handleBlur('quantity')}
            />
          </FormField>
        ) : (
          <>
            <FormField label="New on-hand count" required error={visibleError('newQuantity')}>
              <input
                name="newQuantity"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={values.newQuantity}
                onChange={handleChange('newQuantity')}
                onBlur={handleBlur('newQuantity')}
              />
            </FormField>
            <FormField label="Reason" required error={visibleError('reason')}>
              <select name="reason" value={values.reason} onChange={handleChange('reason')} onBlur={handleBlur('reason')}>
                {ADJUSTMENT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </FormField>
          </>
        )}

        <FormField
          label="Note"
          required={type === 'adjustment' && values.reason === 'Other'}
          error={visibleError('note')}
          hint={type === 'restock' ? 'Optional — e.g. supplier or PO number.' : 'Optional, except for “Other”.'}
        >
          <input
            name="note"
            type="text"
            value={values.note}
            onChange={handleChange('note')}
            onBlur={handleBlur('note')}
            autoComplete="off"
          />
        </FormField>

        {preview && (
          <p className="stock-form__preview" aria-live="polite">
            {preview}
          </p>
        )}
      </form>
    </Drawer>
  )
}

export default StockAdjustDrawer
