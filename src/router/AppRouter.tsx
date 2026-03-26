import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { UserRole } from '@/types/auth.types'
import { ProtectedRoute } from './ProtectedRoute'

const roleRedirects: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  RESPONSABLE: '/responsable/dashboard',
  TECHNICIEN: '/technicien/dashboard',
  CLIENT: '/client/dashboard',
}

const RoleRedirect = () => {
  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth)
  if (!isAuthenticated) return <Navigate to='/login' replace />
  return <Navigate to={roleRedirects[user!.role]} replace />
}

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path='/login' element={<div>Login Page</div>} />
      <Route path='/register' element={<div>Register Page</div>} />
      <Route path='/unauthorized' element={<div>Non autorisé</div>} />
      <Route path='/' element={<RoleRedirect />} />

      <Route path='/admin/*' element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <div>Admin Dashboard</div>
        </ProtectedRoute>
      }/>
      <Route path='/responsable/*' element={
        <ProtectedRoute allowedRoles={['RESPONSABLE']}>
          <div>Responsable Dashboard</div>
        </ProtectedRoute>
      }/>
      <Route path='/technicien/*' element={
        <ProtectedRoute allowedRoles={['TECHNICIEN']}>
          <div>Technicien Dashboard</div>
        </ProtectedRoute>
      }/>
      <Route path='/client/*' element={
        <ProtectedRoute allowedRoles={['CLIENT']}>
          <div>Client Dashboard</div>
        </ProtectedRoute>
      }/>
    </Routes>
  </BrowserRouter>
)