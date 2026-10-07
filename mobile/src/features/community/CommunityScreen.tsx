import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import * as Crypto from 'expo-crypto'
import Constants from 'expo-constants'
import { request } from '@/lib/api'
import { getDeviceId } from '@/lib/deviceId'
import { sessionToken } from '@/lib/session'
import { type Feedback, type Notice, feedbackTypes, feedbackStates } from '../../../../shared/community'

export async function communityRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(`/api/community${path}`, { ...init, headers: { 'X-Device-Id': await getDeviceId(), ...init?.headers } })
}

export function CommunityScreen() {
  const [tab, setTab] = useState('notices')
  const [notices, setNotices] = useState<Notice[]>([])
  const [mine, setMine] = useState<Feedback[]>([])
  const [logged, setLogged] = useState(false)
  const [error, setError] = useState('')
  const [category, setCategory] = useState<Feedback['category']>('BUG')
  const [content, setContent] = useState('')
  const [requestId, setRequestId] = useState(() => Crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState('')
  useEffect(() => {
    let active = true
    communityRequest<Notice[]>('/notices?platform=ANDROID').then(d => { if (active) setNotices(d) }).catch(e => { if (active) setError(e.message) })
    sessionToken().then(async token => { if (active) setLogged(!!token); if (token) { const data = await communityRequest<Feedback[]>('/feedback'); if (active) setMine(data) } }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [])
  async function submit() {
    setBusy(true); setError(''); setReceipt('')
    try {
      const row = await communityRequest<Feedback>('/feedback', { method: 'POST', body: JSON.stringify({ requestId, category, content, platform: 'ANDROID', version: Constants.expoConfig?.version ?? 'unknown', screen: '/community' }) })
      setMine(rows => [row, ...rows.filter(r => r.id !== row.id)]); setContent(''); setRequestId(Crypto.randomUUID()); setReceipt('접수했습니다. 내 문의에서 답변을 확인해주세요.')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <ScrollView className="bg-canvas" contentContainerStyle={{ padding: 20, gap: 16 }}>
    <Text className="text-2xl font-bold text-ink">공지·의견 보내기</Text>
    <View className="flex-row flex-wrap gap-3">{[['notices', '공지사항'], ['feedback', '문제 신고·의견'], ['mine', '내 문의']].map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} className="rounded-xl bg-surface p-3"><Text className="text-ink">{label}</Text></Pressable>)}</View>
    {!!error && <Text accessibilityRole="alert" className="text-red-700">{error}</Text>}{!!receipt && <Text accessibilityRole="alert" className="text-ink">{receipt}</Text>}
    {tab === 'notices' && (notices.length ? notices.map(n => <View key={n.id} className="gap-3 rounded-2xl bg-surface p-4"><Text className="text-lg font-bold text-ink">{n.title}</Text><Text className="text-muted">{new Date(n.startsAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</Text><Text className="text-ink">{n.content}</Text></View>) : <Text className="text-muted">등록된 공지가 없습니다.</Text>)}
    {tab !== 'notices' && !logged && <View className="gap-3"><Text className="text-ink">내 문의와 답변을 확인하려면 Google 계정을 연결해주세요.</Text><Link href="/settings" className="text-brand">설정에서 로그인</Link></View>}
    {tab === 'feedback' && logged && <View className="gap-4"><View className="flex-row gap-2">{Object.entries(feedbackTypes).map(([key, label]) => <Pressable key={key} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: category === key }} onPress={() => { setCategory(key as Feedback['category']); setRequestId(Crypto.randomUUID()) }} className="rounded-xl bg-surface p-3"><Text className="text-ink">{category === key ? '✓ ' : ''}{label}</Text></Pressable>)}</View><TextInput accessibilityLabel="문의 내용" placeholder="무슨 일이 있었나요? 비밀번호·토큰·계좌번호는 입력하지 마세요." multiline maxLength={3000} editable={!busy} value={content} onChangeText={v => { setContent(v); setRequestId(Crypto.randomUUID()) }} style={{ minHeight: 160, textAlignVertical: 'top' }} className="rounded-2xl bg-surface p-4 text-ink" /><Text className="text-muted">{content.length}/3000 · 운영자만 내용을 확인합니다. 앱 버전과 화면 경로를 함께 저장합니다.</Text><Pressable disabled={busy || content.trim().length < 5} onPress={submit} className="rounded-xl bg-brand p-4"><Text className="text-center font-bold text-white">{busy ? '접수 중…' : '접수하기'}</Text></Pressable></View>}
    {tab === 'mine' && logged && <View className="gap-3"><Pressable onPress={() => communityRequest<Feedback[]>('/feedback').then(setMine).catch(e => setError(e.message))}><Text className="text-brand">답변 새로고침</Text></Pressable>{mine.length ? mine.map(f => <View key={f.id} className="gap-2 rounded-2xl bg-surface p-4"><Text className="font-bold text-ink">{feedbackTypes[f.category]} · {feedbackStates[f.status]}</Text><Text className="text-ink">{f.content}</Text><Text className="text-muted">{f.reply ? `운영자 답변 · ${f.reply}` : '아직 답변이 없습니다.'}</Text></View>) : <Text className="text-muted">접수한 문의가 없습니다.</Text>}</View>}
  </ScrollView>
}
