import { LoadingState } from '@/components/LoadingState'
import { ScreenIntro } from '@/components/ScreenIntro'
import { Link } from 'expo-router'
import { OperatorPushSetup } from '@/components/OperatorPushSetup'
// 설정 화면 — 수신 시간·관심 키워드. web/src/features/settings/SettingsPage.tsx와 동일 원칙
// (관심 종목은 이 화면이 아니라 홈의 "종목" 탭에서 관리, 그대로 넘겨서 덮어쓰지 않음).
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useCallback, useEffect, useState } from 'react'
import { Platform, Pressable, ScrollView, Text, View, Switch } from 'react-native'
import Toast from 'react-native-toast-message'

import { ApiRequestError, updateSettings, type Settings } from '@/lib/api'

import { GoogleLinkButton } from './components/GoogleLinkButton'
import { KeywordInput } from './components/KeywordInput'
import { useSettings } from './hooks/useSettings'
import { registerPushToken, unregisterPushToken, hasRegisteredPush } from '@/features/notifications/hooks/useNotificationRegistration'

function timeStringToDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

export function SettingsScreen() {
  const { settings, loading, reload } = useSettings()
  const [pushTime, setPushTime] = useState('08:00')
  const [pushTimes, setPushTimes] = useState<string[]>(['08:00'])
  const [newsPush, setNewsPush] = useState(false)
  const [pushRegistered, setPushRegistered] = useState(false)
  useEffect(() => { void hasRegisteredPush().then(setPushRegistered) }, [])
  const [keywords, setKeywords] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [registeringPush, setRegisteringPush] = useState(false)
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null)

  // 서버(외부 시스템)에서 비동기로 도착한 값으로 편집 가능한 로컬 상태를 동기화 — web/SettingsPage.tsx와
  // 동일한 정당한 effect 용례(React Compiler 린트가 일반적인 setState-in-effect 안티패턴과 구분 못 함).
  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPushTime(settings.pushTime)
      setPushTimes(settings.pushTimes ?? [settings.pushTime])
      setNewsPush(settings.newsPushEnabled ?? false)
      setKeywords(settings.interestKeywords)
      setLinkedEmail(settings.linkedEmail)
    }
  }, [settings])

  // Google 연동(APP-6) 성공 시 서버가 돌려준 설정(연동 전 이 기기의 관심종목 등이 유지됨)으로
  // 편집 중인 화면을 즉시 갱신한다 — 완료 기준이 바로 이 반영이다.
  const handleLinked = useCallback((settings: Settings) => {
    setPushTime(settings.pushTime)
      setPushTimes(settings.pushTimes ?? [settings.pushTime])
      setNewsPush(settings.newsPushEnabled ?? false)
    setKeywords(settings.interestKeywords)
    setLinkedEmail(settings.linkedEmail)
    void reload()
  }, [reload])

  // 계정 삭제(2026-10-06, Play 스토어 요건) 후 이 기기는 다시 익명 상태 — 연동 전 표시로 되돌린다.
  const handleDeleted = useCallback(() => {
    setLinkedEmail(null)
    void reload()
  }, [reload])

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
      await updateSettings({ pushTimes, newsPushEnabled: newsPush, interestKeywords: keywords })
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

  if (loading && !settings) return <View className="flex-1 bg-canvas p-5"><LoadingState message="계정 설정을 확인하고 있어요" /></View>


  if (!settings) return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-5"><Text className="text-ink">설정을 불러오지 못했습니다. 로그인했던 기기라면 Google 계정으로 다시 로그인해주세요.</Text><GoogleLinkButton linkedEmail={null} onLinked={handleLinked} onDeleted={handleDeleted} /><Pressable onPress={() => void reload()} className="min-h-11 items-center justify-center"><Text className="text-brand">설정 다시 불러오기</Text></Pressable></ScrollView>

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-5 pb-10">
      <ScreenIntro eyebrow="설정" title="나만의 설정" description="관심 키워드와 브리핑 수신 시간을 조정하세요." />
      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted">브리핑 수신 시간 · 한국 시간(KST)</Text><Text className="text-xs text-muted">같은 일일 브리핑을 하루 최대 3번 받아요. 아래 저장을 눌러 반영해주세요.</Text><View className="flex-row flex-wrap gap-2">{pushTimes.map(time => <Pressable key={time} accessibilityRole="button" accessibilityLabel={`${time} 수신 시간 삭제`} disabled={pushTimes.length === 1} onPress={() => setPushTimes(values => values.filter(t => t !== time))} className="min-h-11 justify-center rounded-xl bg-surface px-3"><Text className="text-ink">{time} {pushTimes.length > 1 ? '×' : ''}</Text></Pressable>)}</View>
        <Text className="text-xs leading-5 text-muted">발송 여부를 15분 간격으로 확인하므로 설정 시각보다 늦게 도착할 수 있습니다. 브리핑은 한국 시간 07시 이후 준비됩니다.</Text>
        <Pressable
          accessibilityRole="button" accessibilityLabel="새 수신 시간 고르기"
          onPress={() => setShowPicker(true)}
          className="self-start rounded-lg border border-line bg-surface px-4 py-2"
        >
          <Text className="text-base text-ink">{pushTime}</Text>
        </Pressable>
<Pressable accessibilityRole="button" disabled={pushTimes.length >= 3 || pushTimes.includes(pushTime)} onPress={() => setPushTimes(values => [...values, pushTime].sort())} className="min-h-11 justify-center"><Text className="text-brand">선택한 시간 추가</Text></Pressable>
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
        <View className="flex-row items-center justify-between"><Text className="text-ink">새 소식 알림</Text><Switch accessibilityLabel="관심 키워드 새 소식 알림" value={newsPush} onValueChange={setNewsPush} /></View><Text className="text-xs leading-5 text-muted">관심 키워드의 새 기사를 묶어서 최대 1시간에 한 번 알려드려요. 기존 기사는 다시 보내지 않아요.</Text><Text className="text-sm font-semibold text-muted">관심 키워드</Text>
        <KeywordInput value={keywords} onChange={setKeywords} />
      </View>

      <Pressable accessibilityRole="button" onPress={handleSave} disabled={saving} className="items-center rounded-full bg-brand py-3">
        <Text className="text-base font-semibold text-onbrand">{saving ? '저장 중...' : '저장'}</Text>
      </Pressable>

      <Text className="text-xs text-muted">관심 기업은 기업 탐색의 관심 기업 화면에서 관리해요.</Text>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted">계정 (선택)</Text>
        <GoogleLinkButton linkedEmail={linkedEmail} onLinked={handleLinked} onDeleted={handleDeleted} />
        <Text className="text-xs text-muted">
          연동하면 여러 기기에서 같은 설정을 쓸 수 있습니다. 연동하지 않아도 이 기기에서 계속 쓸 수 있습니다.
        </Text>
      </View>
      <OperatorPushSetup linkedEmail={linkedEmail} />
      <View className="gap-2 rounded-xl bg-surface p-4">
        <Text className="text-base font-bold text-ink">이 기기에서 알림 받기</Text>
        <Text className="text-sm leading-6 text-muted">알림은 선택이에요. 브리핑을 받고 싶다면 기기 권한을 허용하고 등록해주세요.</Text>
        <Pressable accessibilityRole="button" disabled={registeringPush} accessibilityState={{ disabled: registeringPush, busy: registeringPush }} className="min-h-11 justify-center" onPress={() => {
          setRegisteringPush(true)
          void registerPushToken().then(registered => { if (registered) setPushRegistered(true); Toast.show({ type: registered ? 'success' : 'info', text1: registered ? '이 기기의 알림을 등록했어요.' : '알림 권한을 허용하면 받을 수 있어요.' }); })
            .catch(() => Toast.show({ type: 'error', text1: '알림을 등록하지 못했어요.', text2: '앱은 계속 사용할 수 있어요. 잠시 후 다시 시도해주세요.' }))
            .finally(() => setRegisteringPush(false))
        }}><Text className="text-base font-semibold text-brand">{registeringPush ? '알림 등록 중…' : pushRegistered ? '알림 다시 등록하기' : '알림 등록하기'}</Text></Pressable><Pressable accessibilityRole="button" disabled={registeringPush} onPress={() => { setRegisteringPush(true); void unregisterPushToken().then(() => { setPushRegistered(false); Toast.show({ type: 'success', text1: '이 기기의 알림을 껐어요.' }) }).catch(() => Toast.show({ type: 'error', text1: '알림을 끄지 못했어요.', text2: '잠시 후 다시 눌러주세요.' })).finally(() => setRegisteringPush(false)) }} className="min-h-11 justify-center"><Text className="text-base text-ink">이 기기 알림 끄기</Text></Pressable>
      </View>
      <Link href="/community" className="py-3 text-brand">공지사항 · 문제 신고·의견 · 내 문의</Link>
      <Link href="/guide" className="py-3 text-brand">앱 도움말</Link>
      <Link href="/privacy" className="py-3 text-brand">개인정보처리방침</Link>
      <Link href="/investment-info" className="py-3 text-brand">투자 정보 이용안내</Link>
    </ScrollView>
  )
}
