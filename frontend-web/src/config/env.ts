const fallbackApiBaseUrl = '/api'

const normalizeBaseUrl = (value?: string) => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallbackApiBaseUrl
}

export const env = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  socketUrl: import.meta.env.VITE_SOCKET_URL?.trim() || '',
  appName: import.meta.env.VITE_APP_NAME?.trim() || 'FTTH Monitor',
  appEnv: import.meta.env.VITE_APP_ENV?.trim() || 'development',
}
