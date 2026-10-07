import { useSyncExternalStore } from 'react'
import { getLoginSession, subscribeSession } from './loginSession'

// Management credentials stay in memory and disappear on reload or access end.
let key = ''
let checkedSession = ''
const listeners = new Set<() => void>()
export const getOperatorKey = () => key
export function setOperatorKey(value: string) {
  key = value
  listeners.forEach(listener => listener())
}
export function useOperatorKey() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, getOperatorKey)
}
export function setAccountOperator(token: string) { checkedSession = token; listeners.forEach(listener => listener()) }
export function useIsOperator() {
  return useSyncExternalStore(listener => { listeners.add(listener); const off = subscribeSession(listener); return () => { listeners.delete(listener); off() } }, () => Boolean(key || (checkedSession && checkedSession === getLoginSession()?.token)))
}
