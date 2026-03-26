export type UserRole = 'ADMIN' | 'RESPONSABLE' | 'TECHNICIEN' | 'CLIENT'

export interface User {
  id: number | string
  email: string
  nom: string
  prenom: string
  role: UserRole
  isActive?: boolean
  createdAt?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginRequest {
  email: string
  motDePasse: string
}

export interface LoginResponse {
  user: User
  token: string
  refreshToken?: string
}

export interface RegisterRequest {
  email: string
  motDePasse: string
  nom: string
  prenom: string
}
