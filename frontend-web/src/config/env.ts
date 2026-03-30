const fallbackApiBaseUrl = 'http://localhost:8000/api'

const normalizeBaseUrl = (value?: string) => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallbackApiBaseUrl
}

export const env = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  appName: import.meta.env.VITE_APP_NAME?.trim() || 'FTTH Monitor',
  appEnv: import.meta.env.VITE_APP_ENV?.trim() || 'development',
}
