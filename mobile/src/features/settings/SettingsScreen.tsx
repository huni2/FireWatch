import { ScreenIntro } from '@/components/ScreenIntro'
import { OperatorPushSetup } from '@/components/OperatorPushSetup'
// 설정 화면 — 수신 시간·관심 키워드. web/src/features/settings/SettingsPage.tsx와 동일 원칙
// (관심 종목은 이 화면이 아니라 홈의 "종목" 탭에서 관리, 그대로 넘겨서 덮어쓰지 않음).
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useEffect, useState } from 'react'
import { Platform, Pressable, ScrollView, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'

import { ApiRequestError, updateSettings, type Settings } from '@/lib/api'

import { GoogleLinkButton } from './components/GoogleLinkButton'
import { KeywordInput } from './components/KeywordInput'
import { useSettings } from './hooks/useSettings'

function timeStringToDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

export function SettingsScreen() {
  const { settings, loading } = useSettings()
  const [pushTime, setPushTime] = useState('08:00')
  const [keywords, setKeywords] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null)

  // 서버(외부 시스템)에서 비동기로 도착한 값으로 편집 가능한 로컬 상태를 동기화 — web/SettingsPage.tsx와
  // 동일한 정당한 effect 용례(React Compiler 린트가 일반적인 setState-in-effect 안티패턴과 구분 못 함).
  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPushTime(settings.pushTime)
      setKeywords(settings.interestKeywords)
      setLinkedEmail(settings.linkedEmail)
    }
  }, [settings])

  // Google 연동(APP-6) 성공 시 서버가 돌려준 설정(연동 전 이 기기의 관심종목 등이 유지됨)으로
  // 편집 중인 화면을 즉시 갱신한다 — 완료 기준이 바로 이 반영이다.
  function handleLinked(settings: Settings) {
    setPushTime(settings.pushTime)
    setKeywords(settings.interestKeywords)
    setLinkedEmail(settings.linkedEmail)
  }

  // 계정 삭제(2026-10-06, Play 스토어 요건) 후 이 기기는 다시 익명 상태 — 연동 전 표시로 되돌린다.
  function handleDeleted() {
    setLinkedEmail(null)
  }

  function handleTimeChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowPicker(false)
    if (event.type === 'set' && date) {
      const hh = String(date.getHours()).padStart(2, '0')
      const mm = String(date.getMinutes()).padStart(2, '0')
      setPushTime(`${hh}:${mm}`)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateSettings({ pushTime, interestKeywords: keywords })
      Toast.show({ type: 'success', text1: '저장 완료', text2: '설정을 저장했습니다.' })
    } catch (error) {
      if (error instanceof ApiRequestError) {
        Toast.show({ type: 'error', text1: '저장 실패', text2: error.apiError.message })
      } else {
        Toast.show({ type: 'error', text1: '저장 실패', text2: '설정 저장에 실패했습니다.' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <Text className="text-base text-muted">불러오는 중...</Text>
      </View>
    )
  }

  if (!settings) return <View className="flex-1 items-center justify-center bg-canvas p-6"><Text>설정을 불러오지 못했습니다. 화면을 다시 열어주세요.</Text></View>

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-5 pb-10">
      <ScreenIntro eyebrow="YOUR PREFERENCES" title="나만의 설정" description="관심 키워드와 브리핑 수신 시간을 조정하세요." />
      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted">푸시 수신 시간 · 한국 시간(KST)</Text>
        <Text className="text-xs leading-5 text-muted">발송 여부를 15분 간격으로 확인하므로 설정 시각보다 늦게 도착할 수 있습니다. 브리핑은 한국 시간 07시 이후 준비됩니다.</Text>
        <Pressable
          onPress={() => setShowPicker(true)}
          className="self-start rounded-lg border border-line bg-surface px-4 py-2"
        >
          <Text className="text-base text-ink">{pushTime}</Text>
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={timeStringToDate(pushTime)}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
        {showPicker && Platform.OS === 'ios' && (
          <Pressable onPress={() => setShowPicker(false)} className="self-end">
            <Text className="text-sm font-semibold text-brand">완료</Text>
          </Pressable>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted">관심 키워드</Text>
        <KeywordInput value={keywords} onChange={setKeywords} />
      </View>

      <Pressable onPress={handleSave} disabled={saving} className="items-center rounded-full bg-brand py-3">
        <Text className="text-base font-semibold text-white">{saving ? '저장 중...' : '저장'}</Text>
      </Pressable>

      <Text className="text-xs text-muted">관심 종목(주식)은 홈의 {'"종목"'} 탭에서 관리합니다.</Text>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted">계정 (선택)</Text>
        <GoogleLinkButton linkedEmail={linkedEmail} onLinked={handleLinked} onDeleted={handleDeleted} />
        <Text className="text-xs text-muted">
          연동하면 여러 기기에서 같은 설정을 쓸 수 있습니다. 연동하지 않아도 이 기기에서 계속 쓸 수 있습니다.
        </Text>
      </View>
      <OperatorPushSetup />
    </ScrollView>
  )
}
