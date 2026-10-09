import { request } from './api'
import type { Settings } from './api'
import { getDeviceId } from './deviceId'
import { clearLoginSession, saveLoginSession } from './loginSession'
import { setOperatorKey, setAccountOperator } from './operatorAccess'
export async function linkGoogleAccount(idToken: string) {
  const data = await request<Settings>('/api/auth/google/link', { method: 'POST', headers: { 'X-Device-Id': getDeviceId() }, body: JSON.stringify({ idToken }) })
  if (!data.session) throw new Error('로그인 세션을 받지 못했습니다. 다시 시도해주세요.')
  saveLoginSession(data.session); setOperatorKey(''); setAccountOperator('')
  return data
}
export async function logoutAccount() {
  await request('/api/auth/logout', { method: 'POST' })
  clearLoginSession(); setOperatorKey(''); setAccountOperator('')
}
export async function deleteAccount() {
  await request('/api/auth/account', { method: 'DELETE' })
  clearLoginSession(); setOperatorKey(''); setAccountOperator('')
}
export type LinkedDevice = { id: string; linkedAt: string; current: boolean }
export const fetchLinkedDevices = () => request<LinkedDevice[]>('/api/auth/devices')
export const revokeLinkedDevice = (id: string) => request<void>(`/api/auth/devices/${encodeURIComponent(id)}`, { method: 'DELETE' })
