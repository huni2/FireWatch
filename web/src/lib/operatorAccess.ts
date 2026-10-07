import { useSyncExternalStore } from 'react'

// Management credentials stay in memory and disappear on reload or access end.
let key = ''
const listeners = new Set<() => void>()
export const getOperatorKey = () => key
export function setOperatorKey(value: string) {
  key = value
  listeners.forEach(listener => listener())
}
export function useOperatorKey() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, getOperatorKey)
}
