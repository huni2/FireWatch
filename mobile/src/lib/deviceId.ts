// 공개 배포 전환([[llm-wiki/Decisions/0012-public-distribution-device-identity]]) — 백엔드가
// UserSettings 싱글톤을 버리고 X-Device-Id로 행을 구분하게 되면서, 이 앱도 요청마다 기기 ID를
// 실어 보내야 한다. 이 앱은 아직 실사용자 데이터가 없어(사이드로드 APK 배포 단계) 웹처럼 레거시
// 기기 폴백이 필요 없다 — 없으면 그냥 새로 만들어 AsyncStorage에 고정한다.
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'firewatch-device-id'

function generateId(): string {
  return `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

let cached: string | null = null

export async function getDeviceId(): Promise<string> {
  if (cached) return cached

  const existing = await AsyncStorage.getItem(STORAGE_KEY)
  if (existing) {
    cached = existing
    return existing
  }

  const created = generateId()
  await AsyncStorage.setItem(STORAGE_KEY, created)
  cached = created
  return created
}
