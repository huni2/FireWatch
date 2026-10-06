// 익명 기기 식별자는 브라우저별로 생성한다. 공개된 과거 소유자 ID는 재사용하지 않는다.
// 기존 소유자 데이터의 운영 DB 이동은 별도 절차로 처리한다.
const STORAGE_KEY = 'firewatch-device-id'
const LEGACY_OWNER_DEVICE_ID = 'legacy-owner-device'
let memoryId: string | null = null

function generateId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function getDeviceId(): string {
  if (memoryId) return memoryId
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing && existing !== LEGACY_OWNER_DEVICE_ID) return (memoryId = existing)

    const seeded = generateId()
    localStorage.setItem(STORAGE_KEY, seeded)
    return (memoryId = seeded)
  } catch {
    // 저장소를 못 쓰면 현재 페이지 세션 동안 같은 ID를 유지한다.
    return (memoryId = generateId())
  }
}
