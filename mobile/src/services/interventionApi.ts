import { api } from './authApi'
import type {
  AddEvidenceRequest,
  ClientApprovalRequest,
  CreateInterventionRequest,
  FieldCheckRequest,
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

type EvidenceApiResponse = {
  success: boolean
  data: unknown
  intervention: InterventionRecord
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
