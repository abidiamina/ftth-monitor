import axios from 'axios'
import type { LoginRequest, LoginResponse } from '@/types/auth.types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

type LoginApiResponse = {
  success: boolean
  token: string
  refreshToken?: string
  user: LoginResponse['user']
  message?: string
}

export const loginUser = async (payload: LoginRequest): Promise<LoginResponse> => {
  const { data } = await api.post<LoginApiResponse>('/auth/login', payload)

  return {
    user: data.user,
    token: data.token,
    refreshToken: data.refreshToken,
  }
}
