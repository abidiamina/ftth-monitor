import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { Alert } from 'react-native'
import { getCurrentUser, loginUser, registerClient, setApiToken } from '../services/authApi'
import { storage } from '../services/storage'
import type { CurrentUser, LoginRequest, RegisterRequest, UserRole } from '../types/auth'

const mobileRoles: UserRole[] = ['CLIENT', 'TECHNICIEN']

type AuthContextValue = {
  isReady: boolean
  isAuthenticated: boolean
  isLoading: boolean
  user: CurrentUser | null
  login: (payload: LoginRequest) => Promise<void>
  register: (payload: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshCurrentUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
  ) {
    return (error as { response?: { data?: { message?: string } } }).response!.data!.message!
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)

  useEffect(() => {
    const bootstrap = async () => {
      const session = await storage.getSession()

      if (!session?.token) {
        setIsReady(true)
        return
      }

      setApiToken(session.token)
      setToken(session.token)
      setRefreshToken(session.refreshToken)

      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch {
        await storage.clearSession()
        setApiToken(null)
        setToken(null)
        setRefreshToken(null)
      } finally {
        setIsReady(true)
      }
    }

    void bootstrap()
  }, [])

  const persistSession = async (
    sessionUser: CurrentUser,
    sessionToken: string,
    sessionRefreshToken: string | null
  ) => {
    setUser(sessionUser)
    setToken(sessionToken)
    setRefreshToken(sessionRefreshToken)

    await storage.setSession({
      user: sessionUser,
      token: sessionToken,
      refreshToken: sessionRefreshToken,
    })
  }

  const validateMobileRole = async (currentUser: CurrentUser) => {
    if (mobileRoles.includes(currentUser.role)) {
      return true
    }

    Alert.alert(
      'Acces non autorise',
      "L'application mobile est reservee aux clients et aux techniciens."
    )
    setApiToken(null)
    await storage.clearSession()
    setUser(null)
    setToken(null)
    setRefreshToken(null)
    return false
  }

  const login = async (payload: LoginRequest) => {
    setIsLoading(true)

    try {
      const session = await loginUser(payload)
      setApiToken(session.token)

      let currentUser: CurrentUser
      try {
        currentUser = await getCurrentUser()
      } catch {
        currentUser = session.user
      }

      if (!(await validateMobileRole(currentUser))) {
        return
      }

      await persistSession(currentUser, session.token, session.refreshToken ?? null)
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Verifie l'email, le mot de passe et l'URL API."
      )
      Alert.alert('Connexion impossible', message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (payload: RegisterRequest) => {
    setIsLoading(true)

    try {
      const session = await registerClient(payload)
      setApiToken(session.token)

      let currentUser: CurrentUser
      try {
        currentUser = await getCurrentUser()
      } catch {
        currentUser = session.user
      }

      if (!(await validateMobileRole(currentUser))) {
        return
      }

      await persistSession(currentUser, session.token, session.refreshToken ?? null)
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Verifie les champs saisis et l'URL API."
      )
      Alert.alert('Inscription impossible', message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setApiToken(null)
    setUser(null)
    setToken(null)
    setRefreshToken(null)
    await storage.clearSession()
  }

  const refreshCurrentUser = async () => {
    if (!token) {
      return
    }

    const currentUser = await getCurrentUser()

    if (!mobileRoles.includes(currentUser.role)) {
      await logout()
      return
    }

    setUser(currentUser)
    await storage.setSession({
      user: currentUser,
      token,
      refreshToken,
    })
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isAuthenticated: Boolean(token),
      isLoading,
      user,
      login,
      register,
      logout,
      refreshCurrentUser,
    }),
    [isLoading, isReady, token, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
