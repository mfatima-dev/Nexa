import { useMemo, useRef, useState } from 'react'
import { useSettings } from '../../context/useSettings.js'
import { CURRENCY_OPTIONS, TIME_ZONE_OPTIONS } from '../../data/settingsDefaults.js'
import {
  BUSINESS_NAME_MAX,
  EMAIL_MAX,
  generalChanged,
  getDeviceTimeZone,
  normalizeGeneral,
  validateGeneral,
} from '../../data/settingsRules.js'
import Button from '../common/Button.jsx'
import FormField from '../common/FormField.jsx'
import Notice from '../common/Notice.jsx'
import './GeneralSettings.css'

/**
 * Business details. The form works on a draft: nothing changes in the app's settings until Save,
 * and Discard puts the saved values back. Errors follow the same pattern as the other forms in
 * Nexa: shown once a field the user edited is left, or on submit.
 */
function GeneralSettings() {
  const { settings, saveGeneral } = useSettings()
  const saved = settings.general
  const formRef = useRef(null)

  const [values, setValues] = useState(saved)
  const [edited, setEdited] = useState({})
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const errors = useMemo(() => validateGeneral(values), [values])
  const dirty = generalChanged(saved, values)
  const deviceTimeZone = useMemo(() => getDeviceTimeZone(), [])
  const visibleError = (field) => (submitted || touched[field] ? errors[field] : undefined)

  function handleChange(field) {
    return (event) => {
      setJustSaved(false)
      setEdited((current) => ({ ...current, [field]: true }))
      setValues((current) => ({ ...current, [field]: event.target.value }))
    }
  }

  function handleBlur(field) {
    return () => {
      if (edited[field]) setTouched((current) => ({ ...current, [field]: true }))
    }
  }

  function resetFlags() {
    setEdited({})
    setTouched({})
    setSubmitted(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)

    if (Object.keys(errors).length > 0) {
      // Send focus to the first field that needs attention.
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    const result = saveGeneral(values)
    if (result.ok) {
      setValues(normalizeGeneral(values)) // show what was actually saved (whitespace trimmed)
      resetFlags()
      setJustSaved(true)
    }
  }

  function handleDiscard() {
    setValues(saved)
    resetFlags()
    setJustSaved(false)
  }

  return (
    <form ref={formRef} className="general-form" onSubmit={handleSubmit} noValidate>
      <div className="general-form__grid">
        <FormField label="Business name" required error={visibleError('businessName')}>
          <input
            name="businessName"
            type="text"
            autoComplete="organization"
            maxLength={BUSINESS_NAME_MAX + 20}
            value={values.businessName}
            onChange={handleChange('businessName')}
            onBlur={handleBlur('businessName')}
          />
        </FormField>

        <FormField
          label="Business email"
          required
          error={visibleError('businessEmail')}
          hint="The contact address for your workspace."
        >
          <input
            name="businessEmail"
            type="email"
            autoComplete="email"
            maxLength={EMAIL_MAX + 20}
            value={values.businessEmail}
            onChange={handleChange('businessEmail')}
            onBlur={handleBlur('businessEmail')}
          />
        </FormField>

        <FormField
          label="Currency"
          required
          error={visibleError('currency')}
          hint="Recorded for this session. Nexa’s pages keep showing US dollars until multi-currency is supported."
        >
          <select name="currency" value={values.currency} onChange={handleChange('currency')} onBlur={handleBlur('currency')}>
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Time zone"
          required
          error={visibleError('timeZone')}
          hint={`Nexa’s pages currently use your device’s time zone (${deviceTimeZone}).`}
        >
          <select name="timeZone" value={values.timeZone} onChange={handleChange('timeZone')} onBlur={handleBlur('timeZone')}>
            {TIME_ZONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div aria-live="polite">
        {justSaved && <Notice>General settings saved. They apply to this session only and reset when you reload.</Notice>}
      </div>

      <div className="general-form__actions">
        <span className="general-form__status">{dirty ? 'You have unsaved changes.' : ''}</span>
        {dirty && (
          <Button variant="secondary" onClick={handleDiscard}>
            Discard changes
          </Button>
        )}
        <Button variant="primary" type="submit" disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </form>
  )
}

export default GeneralSettings
