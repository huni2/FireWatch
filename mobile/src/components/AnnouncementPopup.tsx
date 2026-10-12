import { AppSheet } from '@/components/AppSheet'
import { ActionButton } from '@/components/ActionButton'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, usePathname } from 'expo-router'
import { communityRequest } from '@/features/community/CommunityScreen'
import { sessionToken } from '@/lib/session'
import { type Notice, kstTomorrow } from '../../../shared/community'

let startupInteracted = false
export function noteStartupInteraction() { startupInteracted = true }

export function AnnouncementPopup() {
  const [items, setItems] = useState<Notice[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const currentPath = usePathname()
  const path = useRef(currentPath)
  useEffect(() => { path.current = currentPath }, [currentPath])
  useEffect(() => {
    let active = true
    const initialPath = path.current
    async function load() {
      const token = await sessionToken()
      if (!token && Number(await AsyncStorage.getItem('notice-hidden-anonymous')) > Date.now()) return
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const data = await communityRequest<Notice[]>('/popup?platform=ANDROID', { signal: controller.signal }).finally(() => clearTimeout(timeout))
      if (active && !startupInteracted && initialPath === path.current && token === await sessionToken()) setItems(data)
    }
    load().catch(() => { /* Public notices must not block startup. */ })
    return () => { active = false }
  }, [])
  async function hideToday() {
    setBusy(true)
    try { if (await sessionToken()) await communityRequest('/hide-today', { method: 'POST' }); else await AsyncStorage.setItem('notice-hidden-anonymous', String(kstTomorrow())); setItems([]) } catch { setError('오늘 숨김을 저장하지 못했습니다. 닫기 또는 재시도를 선택해주세요.') } finally { setBusy(false) }
  }
  return <AppSheet open={items.length > 0} title="FireWatch 새 소식" close={() => setItems([])} disabled={busy} footer={<View style={{ gap: 8 }}><ActionButton fullWidth busy={busy} label={busy ? '오늘 숨김을 저장하고 있어요' : '오늘 하루 보지 않기'} onPress={() => void hideToday()} /><ActionButton fullWidth disabled={busy} label="공지사항 전체 보기" onPress={() => { setItems([]); router.push('/community') }} /></View>}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>{items.map(n => <View key={n.id} className="gap-3"><Text className="text-lg font-bold text-ink">{n.title}</Text><Text className="text-base leading-6 text-ink">{n.content}</Text></View>)}{!!error && <Text accessibilityRole="alert" className="text-danger">{error}</Text>}</ScrollView>
  </AppSheet>
}
