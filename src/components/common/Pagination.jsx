import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Pagination.css'

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination__button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Previous
      </button>

      <span className="pagination__indicator">
        Page {page} of {totalPages}
      </span>

      <button
        type="button"
        className="pagination__button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

export default Pagination
