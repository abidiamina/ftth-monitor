import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AuthSession } from '../types/auth'

const SESSION_KEY = 'ftth_mobile_session'

export const storage = {
  async getSession(): Promise<AuthSession | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  },
  async setSession(session: AuthSession) {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
  },
  async clearSession() {
    await AsyncStorage.removeItem(SESSION_KEY)
  },
}
