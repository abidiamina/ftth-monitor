import { api } from './authApi'
import type { NotificationRecord } from '../types/intervention'

type NotificationsApiResponse = {
  success: boolean
  data: NotificationRecord[]
  message?: string
}

type NotificationApiResponse = {
  success: boolean
  data: NotificationRecord
  message?: string
}

export const listNotifications = async (): Promise<NotificationRecord[]> => {
  const { data } = await api.get<NotificationsApiResponse>('/notifications')
  return data.data
}

export const markNotificationAsRead = async (
  id: number | string
): Promise<{ data: NotificationRecord; message: string }> => {
  const { data } = await api.patch<NotificationApiResponse>(`/notifications/${id}/read`)

  return {
    data: data.data,
    message: data.message ?? 'Notification marquee comme lue.',
  }
}
