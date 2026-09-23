import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { getCategoryImage } from '../../data/storefrontImages.js'
import './CategoryCard.css'

/** A large, image-led collection tile — editorial, not a plain filter button. */
function CategoryCard({ category, count }) {
  return (
    <Link to={`/store/shop?category=${encodeURIComponent(category)}`} className="sf-category-card">
      <img src={getCategoryImage(category)} alt="" loading="lazy" className="sf-category-card__image" />
      <div className="sf-category-card__scrim" aria-hidden="true" />
      <div className="sf-category-card__content">
        <div>
          <h3 className="sf-category-card__title">{category}</h3>
          <p className="sf-category-card__count">{count} {count === 1 ? 'piece' : 'pieces'}</p>
        </div>
        <span className="sf-category-card__arrow" aria-hidden="true">
          <ArrowUpRight size={18} strokeWidth={1.8} />
        </span>
      </div>
    </Link>
  )
}

export default CategoryCard
