import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import './Drawer.css'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Right-side modal drawer. Mount it only while open.
 * Handles the dialog semantics: focus moves in on open, Tab is trapped, Escape and
 * backdrop clicks close it, and focus returns to the opener when it unmounts.
 */
function Drawer({ title, badge, closeLabel = 'Close', onClose, footer, initialFocusSelector, children }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const lastFocusedRef = useRef(null)

  // Keep the latest handler without re-running the focus setup when parents pass inline functions.
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const panel = panelRef.current
    // Forms can ask to land on a specific field; otherwise the first focusable element.
    const preferred = initialFocusSelector ? panel.querySelector(initialFocusSelector) : null
    const focusable = panel.querySelectorAll(FOCUSABLE_SELECTOR)
    ;(preferred ?? focusable[0] ?? panel).focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const focusableEls = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
      if (focusableEls.length === 0) return

      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]

      if (!panel.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Remember what was focused inside the dialog (see the focus-loss effect below).
    const trackFocus = (event) => {
      lastFocusedRef.current = event.target
    }
    panel.addEventListener('focusin', trackFocus)

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      panel.removeEventListener('focusin', trackFocus)
      previouslyFocused?.focus?.()
    }
  }, [initialFocusSelector])

  // If the focused element is *removed* by a content change (e.g. a terminal status action),
  // pull focus back into the dialog instead of letting it fall to the page behind. It must be
  // removed, not merely blurred: while Tab moves focus, activeElement is briefly <body>, and
  // stealing focus then would break keyboard navigation between fields.
  useEffect(() => {
    const panel = panelRef.current
    const last = lastFocusedRef.current
    const focusIsLost = document.activeElement === document.body || document.activeElement === null
    if (panel && focusIsLost && last && !last.isConnected) panel.focus()
  })

  return (
    <div className="drawer">
      <div className="drawer__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef} tabIndex={-1}>
        <header className="drawer__header">
          <div>
            <h2 id={titleId} className="drawer__title">
              {title}
            </h2>
            {badge}
          </div>
          <button type="button" className="drawer__close" onClick={onClose} aria-label={closeLabel}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="drawer__body">{children}</div>

        {footer && <footer className="drawer__footer">{footer}</footer>}
      </div>
    </div>
  )
}

export default Drawer
