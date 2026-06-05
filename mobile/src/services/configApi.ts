import { api } from './authApi'

type ConfigurationRecord = {
  id: number
  cle: string
  valeur: string
  libelle: string
  description?: string | null
  updatedAt: string
}

type ConfigsApiResponse = {
  success: boolean
  data: ConfigurationRecord[]
  message?: string
}

export const listConfigs = async (): Promise<ConfigurationRecord[]> => {
  try {
    const { data } = await api.get<ConfigsApiResponse>('/configs')
    return data.data || []
  } catch (error) {
    console.error('Failed to list configs:', error)
    return []
  }
}
