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
  role: Extract<UserRole, 'ADMIN' | 'RESPONSABLE' | 'TECHNICIEN'>
}

export interface UpdateUserRequest {
  nom: string
  prenom: string
  email: string
  telephone?: string
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

export type InterventionStatus = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'

export type InterventionPriority = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE'

export interface ClientRecord {
  id: number
  utilisateurId?: number | null
  nom: string
  prenom: string
  email?: string | null
  telephone: string
  adresse: string
  createdAt?: string
}

export interface InterventionRecord {
  id: number
  titre: string
  description: string
  adresse: string
  latitude?: number | null
  longitude?: number | null
  statut: InterventionStatus
  priorite: InterventionPriority
  dateCreation: string
  datePlanifiee?: string | null
  dateDebut?: string | null
  dateFin?: string | null
  updatedAt?: string
  clientId: number
  technicienId?: number | null
  responsableId: number
  client: ClientRecord
  technicien?: TechnicianRecord | null
  responsable?: {
    id: number
    utilisateur: {
      nom: string
      prenom: string
    }
  } | null
}

export interface CreateInterventionRequest {
  titre: string
  description: string
  adresse: string
  latitude?: number | string
  longitude?: number | string
  priorite?: InterventionPriority
  datePlanifiee?: string
  clientId?: number | string
  technicienId?: number | string
}

export interface UpdateInterventionRequest {
  titre?: string
  description?: string
  adresse?: string
  latitude?: number | string
  longitude?: number | string
  priorite?: InterventionPriority
  statut?: InterventionStatus
  datePlanifiee?: string
  technicienId?: number | string | null
}
