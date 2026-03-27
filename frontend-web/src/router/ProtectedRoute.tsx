import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import type { UserRole } from '@/types/auth.types'

interface Props {
  children: ReactNode
  allowedRoles: UserRole[]
}

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, isAuthenticated, isReady } = useSelector((s: RootState) => s.auth)

  if (!isReady) {
    return (
      <main className='flex min-h-screen items-center justify-center bg-[#071412] px-6 text-sm text-slate-300'>
        Verification de la session...
      </main>
    )
  }
  if (!isAuthenticated) return <Navigate to='/login' replace />
  if (!user) return <Navigate to='/login' replace />
  if (!allowedRoles.includes(user!.role)) return <Navigate to='/unauthorized' replace />

  return <>{children}</>
}
