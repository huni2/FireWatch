import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, usePathname } from 'expo-router'
import { communityRequest } from '@/features/community/CommunityScreen'
import { sessionToken } from '@/lib/session'
import { type Notice, kstTomorrow } from '../../../shared/community'

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
      const data = await communityRequest<Notice[]>('/popup?platform=ANDROID')
      if (active && initialPath === path.current && token === await sessionToken()) setItems(data)
    }
    load().catch(() => { /* Public notices must not block startup. */ })
    return () => { active = false }
  }, [])
  async function hideToday() {
    setBusy(true)
    try { if (await sessionToken()) await communityRequest('/hide-today', { method: 'POST' }); else await AsyncStorage.setItem('notice-hidden-anonymous', String(kstTomorrow())); setItems([]) } catch { setError('오늘 숨김을 저장하지 못했습니다. 닫기 또는 재시도를 선택해주세요.') } finally { setBusy(false) }
  }
  return <Modal visible={items.length > 0} transparent animationType="fade" onRequestClose={() => setItems([])}><View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 20 }}><View className="gap-4 rounded-3xl bg-surface p-5" style={{ maxHeight: '85%' }}><Text className="text-xl font-bold text-ink">FireWatch 새 소식</Text><ScrollView>{items.map(n => <View key={n.id} className="gap-3 pb-5"><Text className="text-lg font-bold text-ink">{n.title}</Text><Text className="text-ink">{n.content}</Text></View>)}</ScrollView>{!!error && <Text accessibilityRole="alert" className="text-red-700">{error}</Text>}<Pressable disabled={busy} onPress={hideToday}><Text className="text-brand">{busy ? '저장 중…' : '오늘 하루 보지 않기'}</Text></Pressable><Pressable onPress={() => { setItems([]); router.push('/community') }}><Text className="text-ink">공지사항 전체 보기</Text></Pressable><Pressable onPress={() => setItems([])} className="rounded-xl bg-brand p-3"><Text className="text-center font-bold text-white">닫기</Text></Pressable></View></View></Modal>
}
