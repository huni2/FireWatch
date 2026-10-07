import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { request } from '../lib/api'
import { getDeviceId } from '../lib/deviceId'
import { CollectionNotice } from './CollectionNotice'

export function OperatorPushSetup({ linkedEmail }: { linkedEmail: string | null }) {
  const [allowedFor, setAllowedFor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  useEffect(() => {
    let active = true
    if (linkedEmail) getDeviceId().then(device => request<{ operator: boolean }>('/api/operations/access', { headers: { 'X-Device-Id': device } }))
      .then(result => { if (active) setAllowedFor(result.operator ? linkedEmail : null) })
      .catch(() => { if (active) setAllowedFor(null) })
    return () => { active = false }
  }, [linkedEmail])
  if (!linkedEmail || allowedFor !== linkedEmail) return null
  const register = async () => {
    setBusy(true)
    try {
      await request('/api/collection/operator', { method: 'POST', headers: { 'X-Device-Id': await getDeviceId() } })
      Toast.show({ type: 'success', text1: '운영자 장애 알림 등록 완료' })
    } catch (error) { Toast.show({ type: 'error', text1: error instanceof Error ? error.message : '등록에 실패했습니다.' }) }
    finally { setBusy(false) }
  }
  const test = async () => {
    setBusy(true)
    try {
      await request('/api/collection/operator/test', { method: 'POST', headers: { 'X-Device-Id': await getDeviceId() } })
      Toast.show({ type: 'success', text1: '알림 제공처가 발송을 수락했습니다.', text2: '기기에서 실제 수신을 확인해주세요.' })
    } catch (error) { Toast.show({ type: 'error', text1: error instanceof Error ? error.message : '테스트 발송에 실패했습니다.' }) }
    finally { setBusy(false) }
  }
  return <View className="gap-3 rounded-xl border border-line bg-surface p-4">
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: diagnosticsOpen }} onPress={() => setDiagnosticsOpen(value => !value)} className="min-h-11 justify-center"><Text className="text-brand">운영자 수집 상태 {diagnosticsOpen ? '접기' : '확인'}</Text></Pressable>
    {diagnosticsOpen && <CollectionNotice />}
    <Text className="font-bold text-ink">운영자 장애 알림</Text>
    <Text className="text-muted">앱 알림 권한을 허용한 뒤 등록하세요. 서버에서 확인한 운영자 계정의 기기로 수집 실패 알림을 받습니다. 기존 운영자 수신자를 교체합니다.</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => Alert.alert('운영자 수신자 등록', '현재 계정으로 기존 운영자 알림 수신자를 교체할까요?', [{ text: '취소', style: 'cancel' }, { text: '등록', onPress: () => void register() }])} className="rounded-lg bg-brand p-3"><Text className="text-center text-white">{busy ? '등록 중...' : '운영자 푸시 등록'}</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void test()} className="min-h-11 justify-center py-3"><Text className="text-brand">수신 확인용 알림 보내기</Text></Pressable><Text className="text-xs text-muted">테스트는 1분에 한 번 직접 발송할 수 있습니다. 실제 기기 수신을 확인해주세요.</Text>
  </View>
}
