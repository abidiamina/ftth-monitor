export type UserRole = 'ADMIN' | 'RESPONSABLE' | 'TECHNICIEN' | 'CLIENT'

export interface User {
  id: number | string
  email: string
  nom: string
  prenom: string
  telephone?: string | null
  role: UserRole
  actif?: boolean
  mustChangePassword?: boolean
}

export interface CurrentUser extends User {
  client?: {
    adresse?: string | null
  } | null
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
  telephone: string
  adresse: string
}

export interface AuthSession {
  user: CurrentUser | null
  token: string | null
  refreshToken: string | null
}
