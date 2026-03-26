import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { UserRole } from '@/types/auth.types'

interface Props {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth)

  if (!isAuthenticated) return <Navigate to='/login' replace />
  if (!allowedRoles.includes(user!.role)) return <Navigate to='/unauthorized' replace />

  return <>{children}</>
}