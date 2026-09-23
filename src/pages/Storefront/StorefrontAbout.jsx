import { Link } from 'react-router-dom'
import { EDITORIAL_IMAGES } from '../../data/storefrontImages.js'
import './StorefrontAbout.css'

function StorefrontAbout() {
  return (
    <div>
      <section className="sf-about-hero">
        <img src={EDITORIAL_IMAGES.storefront()} alt="" className="sf-about-hero__image" />
        <div className="sf-about-hero__scrim" aria-hidden="true" />
        <div className="sf-about-hero__content">
          <span className="storefront__eyebrow storefront__eyebrow--light">About Nexa</span>
          <h1 className="sf-hero__headline sf-about-hero__headline">Made to be used.</h1>
        </div>
      </section>

      <section className="storefront__section sf-about-body">
        <div className="sf-about-body__text">
          <p className="sf-about-body__lead">
            Nexa started with a simple frustration: most bags and travel gear look good in a photo and
            fall apart in a year.
          </p>
          <p>
            We design around use, not trend — durable materials, hardware that survives an airport, and
            details that earn their place. Every product in the shop is chosen the same way: would we
            carry it every day, ourselves?
          </p>
          <p>
            Nexa is a small, independent operation. We keep the catalog focused rather than endless, and
            we'd rather sell one bag you keep for a decade than five you replace every year.
          </p>
          <Link to="/store/shop" className="storefront__btn storefront__btn--outline">
            Shop the collection
          </Link>
        </div>
        <div className="sf-about-body__media">
          <img src={EDITORIAL_IMAGES.portrait()} alt="" />
        </div>
      </section>
    </div>
  )
}

export default StorefrontAbout
