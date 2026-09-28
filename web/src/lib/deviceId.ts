// 공개 배포 전환(2026-09, [[llm-wiki/Decisions/0012-public-distribution-device-identity]]) — 백엔드가
// UserSettings 싱글톤을 버리고 X-Device-Id로 행을 구분하게 되면서, 이 웹 앱도 요청마다 기기 ID를
// 실어 보내야 한다. 이 웹은 소유자 한 명만 쓰는 사설 도구라(공개 배포는 모바일 앱만) 로그인 흐름을
// 새로 만들지 않고, 로컬에 없으면 랜덤 ID를 하나 만들어 localStorage에 고정한다.
//
// 예외: 이 웹의 브라우저는 이 기능이 생기기 전부터 이미 프로덕션에서 실제 설정(관심 종목 등)을 갖고
// 있었다 — 그 기존 데이터가 담긴 행은 백엔드 마이그레이션이 device_id='legacy-owner-device'로
// 지정해뒀다(schema-postgresql.sql). 그래서 localStorage가 비어 있는 첫 로드에서는 새 랜덤 ID 대신
// 이 고정값으로 시드해, 소유자가 계속 같은 설정을 보게 한다. 이후로는 그냥 localStorage 값을 쓴다.
const STORAGE_KEY = 'firewatch-device-id'
const LEGACY_OWNER_DEVICE_ID = 'legacy-owner-device'

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing) return existing

    const seeded = LEGACY_OWNER_DEVICE_ID
    localStorage.setItem(STORAGE_KEY, seeded)
    return seeded
  } catch {
    // localStorage를 못 쓰는 환경(프라이빗 모드 등) — 매 호출마다 새 ID가 나가 기기 식별은 실패하지만
    // 앱 자체는 계속 동작해야 한다.
    return generateId()
  }
}
