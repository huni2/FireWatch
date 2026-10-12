import * as SecureStore from 'expo-secure-store'

const key = 'firewatch-login-session'
const accountListeners = new Set<() => void>()
export function watchAccountSession(listener: () => void) { accountListeners.add(listener); return () => { accountListeners.delete(listener) } }
function accountChanged() { accountListeners.forEach(listener => listener()) }
export type LoginSession = { token: string; expiresAt: string }
let generation = 0
let restoration: Promise<string | null> | null = null
let restorationToken: string | null = null
let writes: Promise<void> = Promise.resolve()
function write(action: () => Promise<void>): Promise<void> {
  writes = writes.catch(() => {}).then(action)
  return writes
}
export async function saveSession(session: LoginSession) {
  generation++; restoration = null
  await write(() => SecureStore.setItemAsync(key, JSON.stringify(session)))
  accountChanged()
}
export async function clearSession() {
  generation++; restoration = null
  await write(() => SecureStore.deleteItemAsync(key))
  accountChanged()
}
// A late 401 from an older request must not erase a newer login/renewal.
export async function invalidateSession(token: string) {
  await write(async () => {
    const value = await SecureStore.getItemAsync(key)
    let current: LoginSession | null = null
    try { current = value ? JSON.parse(value) as LoginSession : null } catch { /* Invalid value. */ }
    if (current?.token !== token) return
    generation++; restoration = null
    await SecureStore.deleteItemAsync(key)
    accountChanged()
  })
}
export async function sessionToken(): Promise<string | null> {
  await writes.catch(() => {})
  const version = generation
  const value = await SecureStore.getItemAsync(key)
  if (generation !== version) return sessionToken()
  if (!value) return null
  let session: LoginSession | null = null
  try { session = JSON.parse(value) as LoginSession } catch { /* Invalid local value. */ }
  if (!session || typeof session.token !== 'string' || !session.token || !Number.isFinite(Date.parse(session.expiresAt))) {
    await clearSession()
    return null
  }
  if (Date.parse(session.expiresAt) > Date.now()) return session.token
  // One attempt per process/session, shared by concurrent requests. Never fall back to
  // anonymous writes when Google or the network is temporarily unavailable.
  if (!restoration || restorationToken !== session.token) {
    restorationToken = session.token
    restoration = restore(session, generation)
  }
  return await restoration
}

async function restore(previous: LoginSession, version: number): Promise<string | null> {
  const { silentGoogleIdToken } = await import('./googleSignIn')
  const idToken = await silentGoogleIdToken()
  if (!idToken) throw new Error('로그인이 만료됐어요. 설정에서 Google 계정으로 다시 로그인해주세요.')
  const { renewGoogleSession } = await import('./api')
  const session = await renewGoogleSession(previous.token, idToken)
  if (generation !== version) throw new Error('로그인 상태가 변경됐어요. 다시 확인해주세요.')
  // Keep generation and shared promise stable until every waiting request resumes.
  await write(async () => {
    if (generation !== version) throw new Error('로그인 상태가 변경됐어요. 다시 확인해주세요.')
    await SecureStore.setItemAsync(key, JSON.stringify(session))
  })
  if (generation !== version) throw new Error('로그인 상태가 변경됐어요. 다시 확인해주세요.')
  return session.token
}
