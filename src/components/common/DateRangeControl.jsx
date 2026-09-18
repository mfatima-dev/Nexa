import './DateRangeControl.css'

function DateRangeControl({ options, value, onChange }) {
  return (
    <div className="date-range" role="group" aria-label="Date range">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`date-range__option${option.key === value ? ' date-range__option--active' : ''}`}
          onClick={() => onChange(option.key)}
          aria-pressed={option.key === value}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default DateRangeControl
