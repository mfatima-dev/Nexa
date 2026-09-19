import { useId } from 'react'
import { TriangleAlert } from 'lucide-react'
import Button from '../common/Button.jsx'
import './DangerZone.css'

const ACTIONS = [
  {
    id: 'reset',
    title: 'Reset workspace data',
    description: 'Return orders, customers, products and inventory to their starting state.',
    button: 'Reset data',
  },
  {
    id: 'delete',
    title: 'Delete workspace',
    description: 'Permanently delete this workspace and everything in it.',
    button: 'Delete workspace',
  },
]

/**
 * Destructive actions, shown so the product is complete but switched off: without saved data and
 * accounts there is nothing real to reset or delete, and Nexa does not fake it. The buttons are
 * disabled and point at the reason for screen-reader users.
 */
function DangerZone() {
  const reasonId = useId()

  return (
    <div className="danger-zone">
      <p id={reasonId} className="danger-zone__reason">
        <TriangleAlert size={16} aria-hidden="true" />
        <span>
          <strong>Unavailable in this version.</strong> Resetting or deleting a workspace needs saved data and accounts, which Nexa
          doesn’t have yet. Nothing here can change or remove your data.
        </span>
      </p>

      <ul className="danger-zone__list">
        {ACTIONS.map((action) => (
          <li key={action.id} className="danger-zone__item">
            <div className="danger-zone__text">
              <p className="danger-zone__title">{action.title}</p>
              <p className="danger-zone__description">{action.description}</p>
            </div>
            <Button variant="danger" disabled aria-describedby={reasonId}>
              {action.button}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default DangerZone
