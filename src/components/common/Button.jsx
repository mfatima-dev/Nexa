import './Button.css'

/** Shared text button. `icon` is an optional lucide component rendered before the label. */
function Button({ variant = 'secondary', icon: Icon, type = 'button', className = '', children, ...rest }) {
  return (
    <button type={type} className={`btn btn--${variant}${className ? ` ${className}` : ''}`} {...rest}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  )
}

export default Button
