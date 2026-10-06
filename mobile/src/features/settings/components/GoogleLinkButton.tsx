// 설정 화면에 Google 계정 연동(선택) 버튼 추가(APP-6, ADR 0012). expo-auth-session의 Android 네이티브
// 클라이언트 플로우는 Expo Go에서 동작하지 않음(Expo 호스팅 리다이렉트 프록시 폐지, 2026-10) —
// 커스텀 dev client 빌드(`eas build --profile development`)에서만 실제 로그인 왕복이 가능하다.
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import Toast from 'react-native-toast-message'

import { ApiRequestError, deleteAccount, linkGoogleAccount, type Settings } from '@/lib/api'

WebBrowser.maybeCompleteAuthSession()

interface GoogleLinkButtonProps {
  // 서버가 확인한 연동 상태(Settings.linkedEmail) — 2026-10-06부터 이 컴포넌트 내부 state가 아니라
  // 서버 응답으로 연동 여부를 판단한다. 이전엔 local state뿐이라 앱을 재실행하면 실제로 연동돼
  // 있어도 "연동 안 됨"으로 보이던 버그가 있었다.
  linkedEmail: string | null
  onLinked: (settings: Settings) => void
  onDeleted: () => void
}

export function GoogleLinkButton({ linkedEmail, onLinked, onDeleted }: GoogleLinkButtonProps) {
  const [linking, setLinking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  })

  useEffect(() => {
    if (response?.type !== 'success' || !response.params.id_token) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLinking(true)
    linkGoogleAccount(response.params.id_token)
      .then((settings) => {
        onLinked(settings)
        Toast.show({ type: 'success', text1: '연동 완료', text2: 'Google 계정과 연동했습니다.' })
      })
      .catch((error) => {
        const message =
          error instanceof ApiRequestError ? error.apiError.message : 'Google 계정 연동에 실패했습니다.'
        Toast.show({ type: 'error', text1: '연동 실패', text2: message })
      })
      .finally(() => setLinking(false))
  }, [response, onLinked])

  // Play 스토어 계정 삭제 요건(2026-10-06) — 연동 해제가 아니라 서버 쪽 계정 자체를 완전히 삭제.
  function handleDeletePress() {
    Alert.alert('계정을 삭제할까요?', '연동된 Google 계정과 공유 설정이 서버에서 완전히 삭제됩니다. 이 작업은 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            await deleteAccount()
            onDeleted()
            Toast.show({ type: 'success', text1: '삭제 완료', text2: '계정과 연동 데이터를 삭제했습니다.' })
          } catch (error) {
            const message = error instanceof ApiRequestError ? error.apiError.message : '계정 삭제에 실패했습니다.'
            Toast.show({ type: 'error', text1: '삭제 실패', text2: message })
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }

  if (linkedEmail) {
    return (
      <View className="gap-2">
        <Text className="text-center text-sm font-semibold text-brand">{linkedEmail} 계정과 연동되었습니다 ✓</Text>
        <Pressable onPress={handleDeletePress} disabled={deleting} className="items-center py-2">
          {deleting ? <ActivityIndicator /> : <Text className="text-sm font-semibold text-red-600">계정 삭제</Text>}
        </Pressable>
      </View>
    )
  }

  return (
    <Pressable
      onPress={() => promptAsync()}
      disabled={!request || linking}
      className="flex-row items-center justify-center gap-2 rounded-full border border-line bg-surface py-3"
    >
      {linking ? (
        <ActivityIndicator />
      ) : (
        <Text className="text-base font-semibold text-muted">Google 계정 연동</Text>
      )}
    </Pressable>
  )
}
