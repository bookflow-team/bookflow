import { Link } from 'react-router-dom'
import './public-discovery.css'

function HomePage() {
  return (
    <section className="public-discovery hero-section" aria-labelledby="home-title">
      <h1 id="home-title">Найдите место, где о вас позаботятся.</h1>
      <p>Выбирайте заведения и знакомьтесь с их услугами.</p>
      <Link className="business-cta" to="/catalog">
        Открыть каталог
      </Link>
    </section>
  )
}

export default HomePage
