
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

function MainLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
