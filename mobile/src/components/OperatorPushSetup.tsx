import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { request } from '../lib/api'
import { getDeviceId } from '../lib/deviceId'

export function OperatorPushSetup() {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const register = async () => {
    setBusy(true)
    try {
      await request('/api/collection/operator', { method: 'POST', headers: { 'X-API-Key': key, 'X-Device-Id': await getDeviceId() } })
      Toast.show({ type: 'success', text1: '운영자 장애 알림 등록 완료' })
    } catch (error) { Toast.show({ type: 'error', text1: error instanceof Error ? error.message : '등록에 실패했습니다.' }) }
    finally { setKey(''); setBusy(false) }
  }
  return <View className="gap-3">
    <Pressable accessibilityRole="button" onPress={() => { setOpen(!open); setKey('') }} className="py-3"><Text className="text-muted">운영자 장애 알림 설정</Text></Pressable>
    {open && <>
      <Text className="text-muted">앱 알림 권한을 허용한 뒤 관리 키로 등록하세요. 이 계정의 기기로 수집 실패 알림을 받습니다. 기존 운영자 수신자를 교체합니다.</Text>
      <TextInput accessibilityLabel="운영자 관리 키" secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="운영자 관리 키" value={key} onChangeText={setKey} className="rounded-lg border border-line bg-surface p-3 text-ink" />
      <Pressable accessibilityRole="button" disabled={busy || !key} onPress={() => void register()} className="rounded-lg bg-brand p-3"><Text className="text-center text-white">{busy ? '등록 중...' : '운영자 푸시 등록'}</Text></Pressable>
    </>}
  </View>
}
