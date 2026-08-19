import { fetchAuditLogs } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

export interface AuditLogFilters {
  eventType?: string
  status?: string
  from?: string
  to?: string
  page: number
  size: number
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useApi(
    () => fetchAuditLogs(filters),
    [filters.eventType, filters.status, filters.from, filters.to, filters.page, filters.size],
  )
}
