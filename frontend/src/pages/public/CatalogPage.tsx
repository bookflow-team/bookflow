import { useState } from 'react'
import './public-discovery.css'
import { getBusinesses, getBusinessCategories } from '../../services/businessService'
import { Link } from 'react-router-dom'

function CatalogPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Все')

  const businesses = getBusinesses()
  const categories = ['Все', ...getBusinessCategories()]

  const query = search.trim().toLocaleLowerCase('ru-RU')
  const filteredBusinesses = businesses.filter((business) => {
    const searchableFields = [
      business.name,
      business.category,
      business.description,
      ...business.services.map((service) => service.name),
    ]
    return (category === 'Все' || business.category === category) &&
      searchableFields.some((field) => field.toLocaleLowerCase('ru-RU').includes(query))
  })

  return (
    <section className="public-discovery catalog-section" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <h1 id="catalog-title">Каталог заведений</h1>

        <span className="results-count" role="status">
          Найдено: {filteredBusinesses.length}
        </span>
      </div>

      <div className="search-panel">
        <label className="sr-only" htmlFor="catalog-search">Поиск заведений или услуг</label>
        <input
          id="catalog-search"
          type="search"
          placeholder="Название заведения или услуга..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="category-list" role="group" aria-label="Категории заведений">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {filteredBusinesses.length > 0 ? (
        <div className="business-grid">
          {filteredBusinesses.map((business) => (
            <Link
              to={`/business/${business.id}`}
              className="business-card"
              key={business.id}
            >
              <div className="business-image">
                <img src={business.imageUrl} alt="" loading="lazy" />
                <span className="business-rating">
                  ★ {business.rating.toFixed(1)}
                </span>
              </div>

              <div className="business-info">
                <p className="business-category">{business.category}</p>
                <h2>{business.name}</h2>
                <p className="business-description">
                  {business.description}
                </p>

                <div className="business-footer">
                  <span>{business.address}</span>
                  <span>Подробнее ↗</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Ничего не найдено</h2>
          <p>Попробуйте изменить запрос или выбрать другую категорию.</p>
        </div>
      )}
    </section>
  )
}

export default CatalogPage
