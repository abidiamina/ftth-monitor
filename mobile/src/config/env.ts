import Constants from 'expo-constants'

const fallbackBaseUrl = 'http://10.0.2.2:3000/api'

const getExpoHost = () => {
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ??
    (Constants as any)?.expoGoConfig?.debuggerHost ??
    (Constants as any)?.manifest?.debuggerHost ??
    null

  if (typeof hostUri !== 'string' || hostUri.trim().length === 0) {
    return null
  }

  return hostUri.split(':')[0] ?? null
}

const resolveApiBaseUrl = () => {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL

  if (raw && raw !== 'AUTO') {
    return raw
  }

  const host = getExpoHost()
  if (host) {
    return `http://${host}:3000/api`
  }

  return fallbackBaseUrl
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
}
