import { api } from '@/services/authApi'
import type {
  AddEvidenceRequest,
  ClientApprovalRequest,
  ClientRecord,
  CreateInterventionRequest,
  FieldCheckRequest,
  InterventionEvidenceRecord,
  InterventionRecord,
  InterventionPriority,
  InterventionStatus,
  UpdateInterventionRequest,
} from '@/types/auth.types'

type ListInterventionsParams = {
  statut?: InterventionStatus
  priorite?: InterventionPriority
  technicienId?: number | string
}

type InterventionApiResponse = {
  success: boolean
  data: InterventionRecord
  message?: string
}

type InterventionsApiResponse = {
  success: boolean
  data: InterventionRecord[]
  message?: string
}

type ClientsApiResponse = {
  success: boolean
  data: ClientRecord[]
  message?: string
}

type ApiMessageResponse = {
  success: boolean
  message: string
}

type EvidenceApiResponse = {
  success: boolean
  data: InterventionEvidenceRecord
  intervention: InterventionRecord
  message?: string
}

export const listInterventions = async (
  params?: ListInterventionsParams
): Promise<InterventionRecord[]> => {
  const { data } = await api.get<InterventionsApiResponse>('/interventions', { params })
  return data.data
}

export const createIntervention = async (
  payload: CreateInterventionRequest
): Promise<{ data: InterventionRecord; message: string }> => {
  const { data } = await api.post<InterventionApiResponse>('/interventions', payload)

  return {
    data: data.data,
    message: data.message ?? 'Intervention creee.',
  }
}

export const updateIntervention = async (
  id: number | string,
  payload: UpdateInterventionRequest
): Promise<{ data: InterventionRecord; message: string }> => {
  const { data } = await api.put<InterventionApiResponse>(`/interventions/${id}`, payload)

  return {
    data: data.data,
    message: data.message ?? 'Intervention mise a jour.',
  }
}

export const deleteIntervention = async (
  id: number | string
): Promise<{ message: string }> => {
  const { data } = await api.delete<ApiMessageResponse>(`/interventions/${id}`)

  return {
    message: data.message,
  }
}

export const listClients = async (): Promise<ClientRecord[]> => {
  const { data } = await api.get<ClientsApiResponse>('/clients')
  return data.data
}

export const updateInterventionFieldCheck = async (
  id: number | string,
  payload: FieldCheckRequest
): Promise<{ data: InterventionRecord; message: string }> => {
  const { data } = await api.patch<InterventionApiResponse>(`/interventions/${id}/field-check`, payload)

  return {
    data: data.data,
    message: data.message ?? 'Controle terrain enregistre.',
  }
}

export const addInterventionEvidence = async (
  id: number | string,
  payload: AddEvidenceRequest
): Promise<{ data: InterventionRecord; message: string }> => {
  const { data } = await api.post<EvidenceApiResponse>(`/interventions/${id}/evidences`, payload)

  return {
    data: data.intervention,
    message: data.message ?? 'Preuve enregistree.',
  }
}

export const submitInterventionClientApproval = async (
  id: number | string,
  payload: ClientApprovalRequest
): Promise<{ data: InterventionRecord; message: string }> => {
  const { data } = await api.patch<InterventionApiResponse>(
    `/interventions/${id}/client-approval`,
    payload
  )

  return {
    data: data.data,
    message: data.message ?? 'Validation client enregistree.',
  }
}
