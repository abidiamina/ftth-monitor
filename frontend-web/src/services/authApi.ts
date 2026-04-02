import axios from 'axios'
import { env } from '@/config/env'
import type {
  ChangePasswordRequest,
  CreateEmployeeRequest,
  CurrentUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  TechnicianRecord,
  UpdateUserRequest,
  UpdateProfileRequest,
  User,
} from '@/types/auth.types'

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ftth_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

type LoginApiResponse = {
  success: boolean
  token: string
  refreshToken?: string
  user: LoginResponse['user']
  message?: string
}

type ApiMessageResponse = {
  success: boolean
  message: string
}

type CurrentUserApiResponse = {
  success: boolean
  user: CurrentUser
}

type UsersApiResponse = {
  success: boolean
  data: User[]
  message?: string
}

type UserApiResponse = {
  success: boolean
  data: User
  message?: string
}

type TechniciansApiResponse = {
  success: boolean
  data: TechnicianRecord[]
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

export const registerClient = async (
  payload: RegisterRequest
): Promise<LoginResponse> => {
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

export const getUserById = async (id: number | string): Promise<CurrentUser> => {
  const { data } = await api.get<{ success: boolean; data: CurrentUser }>(`/users/${id}`)
  return data.data
}

export const updateCurrentUser = async (
  payload: UpdateProfileRequest
): Promise<{ user: User; message: string }> => {
  const { data } = await api.patch<{ success: boolean; message: string; user: User }>(
    '/auth/me',
    payload
  )

  return {
    user: data.user,
    message: data.message,
  }
}

export const changeCurrentPassword = async (
  payload: ChangePasswordRequest
): Promise<{ user: User; message: string }> => {
  const { data } = await api.patch<{ success: boolean; message: string; user: User }>(
    '/auth/change-password',
    payload
  )

  return {
    user: data.user,
    message: data.message,
  }
}

export const listUsers = async (params?: {
  role?: string
  actif?: 'true' | 'false'
}): Promise<User[]> => {
  const { data } = await api.get<UsersApiResponse>('/users', { params })
  return data.data
}

export const createEmployee = async (
  payload: CreateEmployeeRequest
): Promise<{ data: User; message: string }> => {
  const { data } = await api.post<UserApiResponse>('/users/employees', payload)

  return {
    data: data.data,
    message: data.message ?? 'Compte employe cree.',
  }
}

export const updateUserStatus = async (
  id: number | string,
  actif: boolean
): Promise<{ data: User; message: string }> => {
  const { data } = await api.patch<UserApiResponse>(`/users/${id}/status`, { actif })

  return {
    data: data.data,
    message: data.message ?? 'Statut mis a jour.',
  }
}

export const updateUser = async (
  id: number | string,
  payload: UpdateUserRequest
): Promise<{ data: User; message: string }> => {
  const { data } = await api.patch<UserApiResponse>(`/users/${id}`, payload)

  return {
    data: data.data,
    message: data.message ?? 'Utilisateur mis a jour.',
  }
}

export const resetEmployeePassword = async (
  id: number | string
): Promise<{ message: string }> => {
  const { data } = await api.patch<ApiMessageResponse>(`/users/${id}/reset-password`)

  return {
    message: data.message,
  }
}

export const deleteUser = async (id: number | string): Promise<{ message: string }> => {
  const { data } = await api.delete<ApiMessageResponse>(`/users/${id}`)

  return {
    message: data.message,
  }
}

export const listTechnicians = async (): Promise<TechnicianRecord[]> => {
  const { data } = await api.get<TechniciansApiResponse>('/users/techniciens')
  return data.data
}
