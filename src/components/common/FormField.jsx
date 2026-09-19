import { cloneElement, useId } from 'react'
import './FormField.css'

/**
 * Label + control + optional hint/error, wired for accessibility: the label is bound to the
 * control, and the hint/error are exposed through aria-describedby with aria-invalid on errors.
 * `children` must be a single input/select element.
 */
function FormField({ label, error, hint, required = false, children }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={`form-field${error ? ' form-field--invalid' : ''}`}>
      <label className="form-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="form-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? 'true' : undefined,
      })}
      {error && (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      )}
    </div>
  )
}

export default FormField
