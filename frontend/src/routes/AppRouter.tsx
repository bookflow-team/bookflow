import NotFoundPage from '../pages/NotFoundPage'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import MainLayout from '../components/layout/MainLayout'

import HomePage from '../pages/public/HomePage'
import CatalogPage from '../pages/public/CatalogPage'
import BusinessDetailsPage from '../pages/public/BusinessDetailsPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/business/:id" element={<BusinessDetailsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
