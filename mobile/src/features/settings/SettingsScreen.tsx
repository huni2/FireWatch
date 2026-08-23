// 설정 화면 — 수신 시간·관심 키워드. web/src/features/settings/SettingsPage.tsx와 동일 원칙
// (관심 종목은 이 화면이 아니라 웹 종목 화면에서 관리, 그대로 넘겨서 덮어쓰지 않음).
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useEffect, useState } from 'react'
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native'

import { ApiRequestError, updateSettings } from '@/lib/api'

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
  const [watchedStocks, setWatchedStocks] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  // 서버(외부 시스템)에서 비동기로 도착한 값으로 편집 가능한 로컬 상태를 동기화 — web/SettingsPage.tsx와
  // 동일한 정당한 effect 용례(React Compiler 린트가 일반적인 setState-in-effect 안티패턴과 구분 못 함).
  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPushTime(settings.pushTime)
      setKeywords(settings.interestKeywords)
      setWatchedStocks(settings.watchedStocks)
    }
  }, [settings])

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
      await updateSettings({ pushTime, interestKeywords: keywords, watchedStocks })
      Alert.alert('저장 완료', '설정을 저장했습니다.')
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        Alert.alert('저장 실패', 'API 키가 올바르지 않습니다. EXPO_PUBLIC_SETTINGS_API_KEY 설정을 확인하세요.')
      } else if (error instanceof ApiRequestError) {
        Alert.alert('저장 실패', error.apiError.message)
      } else {
        Alert.alert('저장 실패', '설정 저장에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-base text-neutral-500">불러오는 중...</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-6 p-6">
      <View className="gap-2">
        <Text className="text-sm font-semibold text-neutral-500">푸시 수신 시간</Text>
        <Pressable
          onPress={() => setShowPicker(true)}
          className="self-start rounded-lg border border-neutral-300 px-4 py-2"
        >
          <Text className="text-base text-neutral-900">{pushTime}</Text>
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
        <Text className="text-sm font-semibold text-neutral-500">관심 키워드</Text>
        <KeywordInput value={keywords} onChange={setKeywords} />
      </View>

      <Pressable onPress={handleSave} disabled={saving} className="items-center rounded-full bg-brand py-3">
        <Text className="text-base font-semibold text-white">{saving ? '저장 중...' : '저장'}</Text>
      </Pressable>

      <Text className="text-xs text-neutral-400">관심 종목(주식)은 웹 대시보드의 종목 화면에서 관리합니다.</Text>
    </ScrollView>
  )
}
