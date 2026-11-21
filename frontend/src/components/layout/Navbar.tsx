
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { path: '/', label: 'Home' },
    { path: '/catalog', label: 'Catalog' },
    { path: '/login', label: 'Login' },
    { path: '/register', label: 'Register' },
  ]

  return (
    <nav className="bg-gray-900 p-4 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <NavLink to="/" className="text-2xl font-bold"
          onClick={() => setMenuOpen(false)}>
          BookFlow
        </NavLink>

        <button
          type="button"
          className="md:hidden"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className="hidden gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'text-blue-400 font-semibold'
                  : 'hover:text-blue-400'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={`${menuOpen ? 'flex' : 'hidden'} mt-4 flex-col gap-4 md:hidden`}
      >
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === '/'}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              isActive ? 'text-blue-400 font-semibold' : ''
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default Navbar
