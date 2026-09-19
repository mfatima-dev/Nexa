import './Notice.css'

/** Polite confirmation banner (announced to screen readers via role="status"). */
function Notice({ children }) {
  return (
    <p className="notice" role="status">
      {children}
    </p>
  )
}

export default Notice
