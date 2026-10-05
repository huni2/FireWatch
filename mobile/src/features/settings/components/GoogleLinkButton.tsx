// 설정 화면에 Google 계정 연동(선택) 버튼 추가(APP-6, ADR 0012). expo-auth-session의 Android 네이티브
// 클라이언트 플로우는 Expo Go에서 동작하지 않음(Expo 호스팅 리다이렉트 프록시 폐지, 2026-10) —
// 커스텀 dev client 빌드(`eas build --profile development`)에서만 실제 로그인 왕복이 가능하다.
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text } from 'react-native'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import Toast from 'react-native-toast-message'

import { ApiRequestError, linkGoogleAccount, type Settings } from '@/lib/api'

WebBrowser.maybeCompleteAuthSession()

interface GoogleLinkButtonProps {
  onLinked: (settings: Settings) => void
}

export function GoogleLinkButton({ onLinked }: GoogleLinkButtonProps) {
  const [linked, setLinked] = useState(false)
  const [linking, setLinking] = useState(false)
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  })

  useEffect(() => {
    if (response?.type !== 'success' || !response.params.id_token) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLinking(true)
    linkGoogleAccount(response.params.id_token)
      .then((settings) => {
        setLinked(true)
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

  if (linked) {
    return <Text className="text-center text-sm font-semibold text-brand">Google 계정과 연동되었습니다 ✓</Text>
  }

  return (
    <Pressable
      onPress={() => promptAsync()}
      disabled={!request || linking}
      className="flex-row items-center justify-center gap-2 rounded-full border border-neutral-300 py-3"
    >
      {linking ? (
        <ActivityIndicator />
      ) : (
        <Text className="text-base font-semibold text-neutral-700">Google 계정 연동</Text>
      )}
    </Pressable>
  )
}
