import axios from 'axios'
import { env } from '../config/env'
import type { CurrentUser, LoginRequest, LoginResponse, RegisterRequest } from '../types/auth'

let authToken: string | null = null

export const setApiToken = (token: string | null) => {
  authToken = token
}

const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }

  return config
})

type LoginApiResponse = {
  token: string
  refreshToken?: string
  user: LoginResponse['user']
}

type CurrentUserApiResponse = {
  user: CurrentUser
}

export const loginUser = async (payload: LoginRequest): Promise<LoginResponse> => {
  const { data } = await api.post<LoginApiResponse>('/auth/login', payload)

  return {
    user: data.user,
    token: data.token,
    refreshToken: data.refreshToken,
  }
}

export const registerClient = async (payload: RegisterRequest): Promise<LoginResponse> => {
  const { data } = await api.post<LoginApiResponse>('/auth/register', payload)

  return {
    user: data.user,
    token: data.token,
    refreshToken: data.refreshToken,
  }
}

export const getCurrentUser = async (): Promise<CurrentUser> => {
  const { data } = await api.get<CurrentUserApiResponse>('/auth/me')
  return data.user
}
