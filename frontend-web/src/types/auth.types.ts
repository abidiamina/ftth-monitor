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
  createdAt?: string
  updatedAt?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isReady: boolean
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

export interface ClientProfile {
  id: number
  utilisateurId?: number
  nom: string
  prenom: string
  email: string
  telephone: string
  adresse: string
}

export interface TechnicianProfile {
  id: number
  utilisateurId?: number
}

export interface ResponsableProfile {
  id: number
  utilisateurId?: number
}

export interface CurrentUser extends User {
  client?: ClientProfile | null
  technicien?: TechnicianProfile | null
  responsable?: ResponsableProfile | null
}

export interface UpdateProfileRequest {
  nom: string
  prenom: string
  telephone?: string
  adresse?: string
}

export interface ChangePasswordRequest {
  motDePasseActuel: string
  nouveauMotDePasse: string
}

export interface CreateEmployeeRequest {
  nom: string
  prenom: string
  email: string
  telephone?: string
  role: Extract<UserRole, 'RESPONSABLE' | 'TECHNICIEN'>
}

export interface TechnicianRecord {
  id: number
  utilisateur: {
    id: number
    nom: string
    prenom: string
    email: string
    telephone?: string | null
    actif: boolean
  }
}
