import { fetchSettings } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'
import { useLoginSession } from '../../../lib/loginSession'

export function useSettings(options: { timeoutMs?: number; retryDelaysMs?: readonly number[] } = {}) {
  const session = useLoginSession()
  return useApi(async () => {
    const signal = options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined
    try { return await fetchSettings(signal) }
    catch (error) {
      if (signal?.aborted) throw new Error('서버 응답을 기다리는 시간이 길어졌어요. 다시 확인해주세요.')
      throw error
    }
  }, [session?.token, options.timeoutMs], options.retryDelaysMs)
}
