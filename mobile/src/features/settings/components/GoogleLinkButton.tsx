// 선택적 Google 계정 연결(APP-6). 커스텀 Android 빌드에서 서명/OAuth 왕복을 검증한다.
// Expo Go와 JS export는 설치 앱의 로그인 검증을 대신하지 않는다.
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import Toast from 'react-native-toast-message'

import { ApiRequestError, deleteAccount, linkGoogleAccount, logoutAccount, fetchLinkedDevices, revokeLinkedDevice, type LinkedDevice, type Settings } from '@/lib/api'

WebBrowser.maybeCompleteAuthSession()

interface GoogleLinkButtonProps {
  // 서버가 확인한 연동 상태(Settings.linkedEmail) — 2026-10-06부터 이 컴포넌트 내부 state가 아니라
  // 서버 응답으로 연동 여부를 판단한다. 이전엔 local state뿐이라 앱을 재실행하면 실제로 연동돼
  // 있어도 "연동 안 됨"으로 보이던 버그가 있었다.
  linkedEmail: string | null
  onLinked: (settings: Settings) => void
  onDeleted: () => void
}

export function GoogleLinkButton(props: GoogleLinkButtonProps) {
  if (!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) return <Text className="text-sm text-muted">이 빌드에서는 Google 로그인을 준비 중입니다. 계정 연동 없이도 이용할 수 있습니다.</Text>
  return <ConfiguredGoogleLinkButton {...props} />
}

function ConfiguredGoogleLinkButton({ linkedEmail, onLinked, onDeleted }: GoogleLinkButtonProps) {
  const [linking, setLinking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [devices, setDevices] = useState<LinkedDevice[] | null>(null)
  const [deviceBusy, setDeviceBusy] = useState(false)
  async function manageDevices() {
    setDeviceBusy(true)
    try { setDevices(await fetchLinkedDevices()) }
    catch (error) { Toast.show({ type: 'error', text1: '기기 확인 실패', text2: error instanceof Error ? error.message : '다시 로그인해주세요.' }) }
    finally { setDeviceBusy(false) }
  }
  function revokeDevice(device: LinkedDevice) {
    Alert.alert('이 기기의 연결을 해제할까요?', '계정에 저장한 데이터는 유지됩니다. 이 기기는 다시 로그인해야 접근할 수 있어요.', [
      { text: '취소', style: 'cancel' }, { text: '연결 해제', style: 'destructive', onPress: async () => {
        setDeviceBusy(true)
        try { await revokeLinkedDevice(device.id); setDevices((rows) => rows?.filter((row) => row.id !== device.id) ?? null) }
        catch (error) { Toast.show({ type: 'error', text1: '연결 해제 실패', text2: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.' }) }
        finally { setDeviceBusy(false) }
      } },
    ])
  }
  async function logout() {
    setDeviceBusy(true)
    try { await logoutAccount(); setDevices(null); onDeleted(); Toast.show({ type: 'success', text1: '로그아웃했습니다', text2: '계정 데이터는 보관됩니다.' }) }
    catch (error) { Toast.show({ type: 'error', text1: '로그아웃 실패', text2: error instanceof Error ? error.message : '다시 시도해주세요.' }) }
    finally { setDeviceBusy(false) }
  }
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
        <Text className="text-xs text-muted">로그인은 30일간 유지됩니다. 만료되면 Google 계정으로 다시 로그인해주세요.</Text>
        <Pressable disabled={!request || linking} onPress={() => promptAsync()} className="min-h-11 items-center justify-center"><Text className="text-brand">Google 로그인 갱신</Text></Pressable>
        <Pressable disabled={deviceBusy} onPress={manageDevices} className="min-h-11 items-center justify-center"><Text className="text-brand">연결된 기기 확인</Text></Pressable>
        {devices?.map((device, index) => <View key={device.id} className="rounded-xl border border-line p-3">
          <Text className="font-semibold text-ink">{device.current ? '현재 기기' : `연결 기기 ${index + 1}`}</Text>
          <Text className="text-xs text-muted">연결일 · {new Date(device.linkedAt).toLocaleDateString('ko-KR')}</Text>
          {!device.current && <Pressable disabled={deviceBusy} onPress={() => revokeDevice(device)} className="min-h-11 justify-center"><Text className="text-red-600">연결 해제</Text></Pressable>}
        </View>)}
        <Pressable disabled={deviceBusy} onPress={logout} className="min-h-11 items-center justify-center"><Text className="text-muted">이 기기에서 로그아웃</Text></Pressable>
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
