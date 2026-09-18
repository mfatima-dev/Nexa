import './SectionCard.css'

function SectionCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`section-card${className ? ` ${className}` : ''}`}>
      {(title || actions) && (
        <header className="section-card__header">
          <div>
            {title && <h2 className="section-card__title">{title}</h2>}
            {subtitle && <p className="section-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="section-card__actions">{actions}</div>}
        </header>
      )}
      <div className="section-card__body">{children}</div>
    </section>
  )
}

export default SectionCard
