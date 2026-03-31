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
}

export interface TechnicianRecord {
  id: number
  utilisateur: {
    id: number
    nom: string
    prenom: string
    email?: string | null
    telephone?: string | null
  }
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
  validee?: boolean
  dateValidation?: string | null
  clientId: number
  technicienId?: number | null
  responsableId: number
  client: ClientRecord
  technicien?: TechnicianRecord | null
}

export interface CreateInterventionRequest {
  titre: string
  description: string
  adresse: string
  latitude?: number | string
  longitude?: number | string
  priorite?: InterventionPriority
  datePlanifiee?: string
}

export interface UpdateInterventionRequest {
  statut?: InterventionStatus
  validee?: boolean
  technicienId?: number | string | null
}

export interface NotificationRecord {
  id: number
  titre: string
  message: string
  lu: boolean
  createdAt: string
  interventionId?: number | null
  userId: number
}
