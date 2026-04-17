import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import type { UserRole } from '@/types/auth.types'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { ClientDashboardPage } from '@/pages/client/ClientDashboardPage'
import { ResponsableDashboardPage } from '@/pages/responsable/ResponsableDashboardPage'
import { UnauthorizedPage } from '@/pages/system/UnauthorizedPage'
import { TechnicienDashboardPage } from '@/pages/technicien/TechnicienDashboardPage'
import { ProtectedRoute } from './ProtectedRoute'

const roleRedirects: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  RESPONSABLE: '/responsable/dashboard',
  TECHNICIEN: '/technicien/dashboard',
  CLIENT: '/client/dashboard',
}

const RoleRedirect = () => {
  const { user, isAuthenticated, isReady } = useSelector((s: RootState) => s.auth)

  if (!isReady) {
    return (
      <main className='flex min-h-screen items-center justify-center px-6 text-sm text-slate-800'>
        Verification de la session...
      </main>
    )
  }
  if (!isAuthenticated) return <Navigate to='/login' replace />
  if (!user) return <Navigate to='/login' replace />

  return <Navigate to={roleRedirects[user!.role]} replace />
}

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route path='/register' element={<RegisterPage />} />
      <Route path='/unauthorized' element={<UnauthorizedPage />} />
      <Route path='/' element={<RoleRedirect />} />

      <Route
        path='/admin/*'
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/responsable/*'
        element={
          <ProtectedRoute allowedRoles={['RESPONSABLE']}>
            <ResponsableDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/technicien/*'
        element={
          <ProtectedRoute allowedRoles={['TECHNICIEN']}>
            <TechnicienDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path='/client/*'
        element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <ClientDashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  </BrowserRouter>
)
