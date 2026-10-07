import { useMemo, useSyncExternalStore } from 'react'
import { getDeviceId } from './deviceId'
const KEY = 'firewatch-login-session'
export type LoginSession = { token: string; expiresAt: string; deviceId: string }
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())
const snapshot = () => { try { return localStorage.getItem(KEY) ?? '' } catch { return '' } }
export const subscribeSession = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
function parse(value: string): LoginSession | null {
  try {
    const session = JSON.parse(value) as LoginSession
    if (typeof session.token === 'string' && session.token.length >= 40 && session.deviceId === getDeviceId() && Number.isFinite(Date.parse(session.expiresAt))) return session
  } catch { /* Invalid browser state cannot authenticate a request. */ }
  return null
}
export function getLoginSession() {
  const session = parse(snapshot())
  return session && Date.parse(session.expiresAt) > Date.now() ? session : null
}
export function saveLoginSession(session: { token: string; expiresAt: string }) {
  const record = { ...session, deviceId: getDeviceId() }
  if (!parse(JSON.stringify(record)) || Date.parse(session.expiresAt) <= Date.now()) throw new Error('유효한 로그인 세션을 받지 못했습니다.')
  localStorage.setItem(KEY, JSON.stringify(record)); notify()
}
export function clearLoginSession() { try { localStorage.removeItem(KEY) } finally { notify() } }
export function useLoginSession() {
  const raw = useSyncExternalStore(subscribeSession, snapshot)
  return useMemo(() => parse(raw), [raw])
}
export function watchLoginSession() {
  const storage = (e: StorageEvent) => { if (e.key === KEY || e.key == null) window.location.reload() }
  const timer = window.setInterval(() => { if (snapshot() && !getLoginSession()) clearLoginSession() }, 60000)
  window.addEventListener('storage', storage)
  return () => { clearInterval(timer); window.removeEventListener('storage', storage) }
}
