import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, User } from '@/types/auth.types'

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('ftth_token'),
  refreshToken: localStorage.getItem('ftth_refresh_token'),
  isAuthenticated: Boolean(localStorage.getItem('ftth_token')),
  isLoading: false,
  isReady: false,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; refreshToken?: string }>
    ) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken ?? null
      state.isAuthenticated = true
      state.isLoading = false
      state.isReady = true
      localStorage.setItem('ftth_token', action.payload.token)
      if (action.payload.refreshToken) {
        localStorage.setItem('ftth_refresh_token', action.payload.refreshToken)
      } else {
        localStorage.removeItem('ftth_refresh_token')
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = Boolean(state.token)
      state.isReady = true
    },
    markReady: (state) => {
      state.isReady = true
    },
    clearSession: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.isLoading = false
      state.isReady = true
      localStorage.removeItem('ftth_token')
      localStorage.removeItem('ftth_refresh_token')
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.isLoading = false
      state.isReady = true
      localStorage.removeItem('ftth_token')
      localStorage.removeItem('ftth_refresh_token')
    },
  },
})

export const { setCredentials, setLoading, setUser, markReady, clearSession, logout } =
  authSlice.actions
export default authSlice.reducer
