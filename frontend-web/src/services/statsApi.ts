import { api } from '@/services/authApi'

export type TechnicianPerformance = {
  id: number
  nom: string
  totalTerminees: number
  avgRating: number
  satisfactionRate: number
  sentiments: {
    POSITIVE: number
    NEUTRAL: number
    NEGATIVE: number
  }
}

type PerformanceApiResponse = {
  success: boolean
  data: TechnicianPerformance[]
}

export const getTechnicianPerformance = async (): Promise<TechnicianPerformance[]> => {
  const { data } = await api.get<PerformanceApiResponse>('/stats/technicians')
  return data.data
}
