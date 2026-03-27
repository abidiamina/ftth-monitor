import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getCurrentUser } from '@/services/authApi'
import { clearSession, markReady, setUser } from '@/store/authSlice'
import type { RootState } from '@/store'

export const AuthBootstrap = () => {
  const dispatch = useDispatch()
  const { token, isReady } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (isReady) return

    if (!token) {
      dispatch(markReady())
      return
    }

    const hydrate = async () => {
      try {
        const user = await getCurrentUser()
        dispatch(setUser(user))
      } catch {
        dispatch(clearSession())
      }
    }

    hydrate()
  }, [dispatch, isReady, token])

  return null
}
