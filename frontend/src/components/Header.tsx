
import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand">
        BOOKFLOW<span>.</span>
      </Link>

      <nav className="main-nav">
        <Link to="/">Каталог</Link>
        <a href="#about">О сервисе</a>
      </nav>

      <button className="login-button" type="button">
        Войти
      </button>
    </header>
  )
}
