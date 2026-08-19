import { fetchSettings } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

export function useSettings() {
  return useApi(() => fetchSettings())
}
