import './IconButton.css'

function IconButton({ icon: Icon, label, onClick, variant = 'ghost', size = 18, className = '' }) {
  return (
    <button
      type="button"
      className={`icon-button icon-button--${variant}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-label={label}
    >
      <Icon size={size} aria-hidden="true" />
    </button>
  )
}

export default IconButton
