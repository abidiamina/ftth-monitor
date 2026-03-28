import { api } from '@/services/authApi'
import type {
  ClientRecord,
  CreateInterventionRequest,
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
