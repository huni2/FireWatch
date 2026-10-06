// 개인정보 이용 동의 여부를 기기에 저장 — 동의 전에는 앱을 쓸 수 없게(ConsentScreen이 막음).
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'firewatch-privacy-consent'

export async function hasConsented(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEY)
  return value === 'true'
}

export async function setConsented(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, 'true')
}
