import { api } from './authApi'
import type { ConfigurationRecord } from '@/types/auth.types'

export async function listConfigs(): Promise<ConfigurationRecord[]> {
  try {
    const response = await api.get('/configs')
    return response.data?.data || []
  } catch (err) {
    console.error('Failed to list configs:', err)
    return []
  }
}

export async function updateConfig(cle: string, valeur: string): Promise<{ success: boolean; data: ConfigurationRecord; message: string }> {
  const response = await api.patch(`/configs/${cle}`, { valeur })
  return response.data
}
