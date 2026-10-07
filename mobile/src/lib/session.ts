import * as SecureStore from 'expo-secure-store'

const key = 'firewatch-login-session'
export type LoginSession = { token: string; expiresAt: string }
export const saveSession = (session: LoginSession) => SecureStore.setItemAsync(key, JSON.stringify(session))
export const clearSession = () => SecureStore.deleteItemAsync(key)
export async function sessionToken(): Promise<string | null> {
  const value = await SecureStore.getItemAsync(key)
  if (!value) return null
  try {
    const session = JSON.parse(value) as LoginSession
    if (typeof session.token === 'string' && Date.parse(session.expiresAt) > Date.now()) return session.token
  } catch { /* Invalid local session requires Google sign-in again. */ }
  await clearSession()
  return null
}
