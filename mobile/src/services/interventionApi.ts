import { api } from './authApi'
import type {
  CreateInterventionRequest,
  InterventionRecord,
  UpdateInterventionRequest,
} from '../types/intervention'

type InterventionsApiResponse = {
  success: boolean
  data: InterventionRecord[]
  message?: string
}

type InterventionApiResponse = {
  success: boolean
  data: InterventionRecord
  message?: string
}

export const listInterventions = async (): Promise<InterventionRecord[]> => {
  const { data } = await api.get<InterventionsApiResponse>('/interventions')
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
