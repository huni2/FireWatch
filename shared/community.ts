export type Feedback = { id: string; category: 'BUG' | 'IDEA' | 'OTHER'; content: string; platform: string; version: string; screen: string; status: string; reply: string; createdAt: string; updatedAt: string }
export type Notice = { id: string; title: string; content: string; target: 'ALL' | 'WEB' | 'ANDROID'; popup: boolean; startsAt: string; endsAt: string | null; published: boolean }
export const feedbackTypes = { BUG: '오류 신고', IDEA: '개선 제안', OTHER: '기타' }
export const feedbackStates: Record<string, string> = { NEW: '접수', REVIEWING: '확인 중', RESOLVED: '해결', DEFERRED: '보류' }
export function kstTomorrow(now = Date.now()) {
  const kst = new Date(now + 9 * 3600000)
  return Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + 1) - 9 * 3600000
}
