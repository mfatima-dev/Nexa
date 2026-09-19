import { useId } from 'react'
import './ToggleSwitch.css'

/**
 * A labelled on/off setting: title, description and a switch. The switch is a real <button
 * role="switch">, so it takes focus and toggles with Space or Enter, and screen readers announce
 * its name, description and on/off state.
 */
function ToggleSwitch({ label, description, checked, onChange, disabled = false }) {
  const id = useId()
  const labelId = `${id}-label`
  const descriptionId = `${id}-description`

  return (
    <div className="toggle-switch">
      <div className="toggle-switch__text">
        <span id={labelId} className="toggle-switch__label">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="toggle-switch__description">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        className={`toggle-switch__control${checked ? ' toggle-switch__control--on' : ''}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-switch__thumb" aria-hidden="true" />
      </button>
    </div>
  )
}

export default ToggleSwitch
