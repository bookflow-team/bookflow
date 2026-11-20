
import { useMemo, useState } from 'react'
import { getBusinesses, getBusinessCategories } from '../services/businessService'
import Header from '../components/Header'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Все')

  const businesses = getBusinesses()
  const categories = ['Все', ...getBusinessCategories()]

  const filteredBusinesses = useMemo(() => {
    const query = search.toLowerCase().trim()

    return businesses.filter((business) => {
      const matchesSearch =
        business.name.toLowerCase().includes(query) ||
        business.category.toLowerCase().includes(query) ||
        business.description.toLowerCase().includes(query)

      const matchesCategory =
        category === 'Все' || business.category === category

      return matchesSearch && matchesCategory
    })
  }, [search, category, businesses])

  return (
    <div className="app-shell">
      <Header />

      <main>
        <section className="hero-section">
          <p className="eyebrow">ВАШЕ ВРЕМЯ. ВАШ ВЫБОР.</p>

          <h1>
            Найдите место,
            <br />
            где о вас <span>позаботятся.</span>
          </h1>

          <p className="hero-description">
            Лучшие заведения и услуги — в одном месте.
            Выбирайте мастеров, изучайте предложения и планируйте свой день.
          </p>

          <div className="search-panel">
            <span className="search-icon">⌕</span>
            <input
              type="search"
              placeholder="Название заведения или услуга..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className="search-hint">ПОИСК</span>
          </div>

          <div className="hero-meta">
            <span>01 — НАЙДИТЕ</span>
            <span>02 — ВЫБЕРИТЕ</span>
            <span>03 — ЗАПИШИТЕСЬ</span>
          </div>
        </section>

        <section className="catalog-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ПОДБОРКА BOOKFLOW</p>
              <h2>Популярные заведения</h2>
            </div>

            <span className="results-count">
              {filteredBusinesses.length} ЗАВЕДЕНИЯ
            </span>
          </div>

          <div className="category-list">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`category-button ${
                  category === item ? 'active' : ''
                }`}
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
                    <img src={business.imageUrl} alt={business.name} />
                    <span className="business-rating">
                      ★ {business.rating.toFixed(1)}
                    </span>
                  </div>

                  <div className="business-info">
                    <p className="business-category">{business.category}</p>
                    <h3>{business.name}</h3>
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
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить запрос или выбрать другую категорию.</p>
            </div>
          )}
        </section>

        <section className="about-section" id="about">
          <p className="eyebrow">BOOKFLOW</p>
          <h2>Ваше время заслуживает большего.</h2>
          <p>Находите подходящие услуги и выбирайте удобное время для посещения.</p>
        </section>
      </main>

      <footer className="site-footer">
        <span>BOOKFLOW.</span>
        <span>Ваше время. Ваш выбор.</span>
      </footer>
    </div>
  )
}
