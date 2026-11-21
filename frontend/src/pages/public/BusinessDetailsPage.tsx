import { Link, useParams } from 'react-router-dom'
import { getBusinessById } from '../../services/businessService'
import type { BusinessService } from '../../types/business'
import './public-discovery.css'

function ServiceCard({ service }: { service: BusinessService }) {
  return (
    <article className="service-card">
      <div className="service-card-top">
        <span className="service-label">УСЛУГА</span>
        <span className="service-duration">
          ◷ {service.duration} мин.
        </span>
      </div>

      <h3>{service.name}</h3>

      <p className="service-description">
        {service.description}
      </p>

      <div className="service-card-bottom">
        <div className="service-price">
          <span>СТОИМОСТЬ</span>
          <strong>
            {service.price.toLocaleString('ru-RU')} ₽
          </strong>
        </div>

        <button
          className="service-book-button"
          type="button"
          disabled
          title="Онлайн-запись появится на следующем этапе"
        >
          Скоро запись
        </button>
      </div>
    </article>
  )
}

function BusinessDetailsPage() {
  const { id } = useParams()
  const business = id ? getBusinessById(id) : undefined

  if (!business) {
    return (
      <section className="public-discovery business-not-found" aria-labelledby="business-title">
        <h1 id="business-title">Заведение не найдено</h1>
        <p>Возможно, ссылка устарела или заведение больше недоступно.</p>
        <Link to="/catalog" className="back-home-button">
          Вернуться в каталог
        </Link>
      </section>
    )
  }

  return (
    <section className="public-discovery business-page" aria-labelledby="business-title">
      <div className="business-page-container">
        <Link to="/catalog" className="back-link">
          <span>←</span> Вернуться в каталог
        </Link>

        <section className="business-hero">
          <div className="business-hero-image">
            <img src={business.imageUrl} alt={business.name} />
          </div>

          <div className="business-hero-info">
            <span className="business-category">
              {business.category}
            </span>

            <h1 id="business-title">{business.name}</h1>

            <div className="business-rating">
              <span className="rating-star">★</span>
              <strong>{business.rating}</strong>
              <span>({business.reviewCount} отзывов)</span>
            </div>

            <div className="business-address">
              <span className="info-icon">⌖</span>
              {business.address}
            </div>

            <div className="business-description">
              <p>{business.description}</p>
            </div>

            <a href="#services" className="business-cta">
              Посмотреть услуги <span>↓</span>
            </a>
          </div>
        </section>

        <section className="services-section" id="services">
          <div className="services-heading">
            <div>
              <span className="section-eyebrow">
                НАШИ ПРЕДЛОЖЕНИЯ
              </span>
              <h2>Услуги заведения</h2>
              <p>
                Выберите подходящую услугу и ознакомьтесь с условиями.
              </p>
            </div>

            <span className="services-count">
              Услуг: {business.services.length}
            </span>
          </div>

          {business.services.length > 0 ? (
            <div className="services-grid">
              {business.services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="services-empty">
              <span>✦</span>
              <h3>Пока нет доступных услуг</h3>
              <p>
                Заведение ещё не добавило услуги. Загляните позже.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default BusinessDetailsPage
