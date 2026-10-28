// 선택적 Google 계정 연결(APP-6). 커스텀 Android 빌드에서 서명/OAuth 왕복을 검증한다.
// Expo Go와 JS export는 설치 앱의 로그인 검증을 대신하지 않는다.
import { useEffect, useRef, useState } from 'react'
import { AccountRecordLinkSheet } from './AccountRecordLinkSheet'
import { accountRecordComparison, accountRecordErrorMessage, type AccountRecordChoice, type AccountRecordComparison } from '../../../../../shared/account-record-link'
import { Alert, Pressable, Text, View } from 'react-native'
import { LoadingIndicator } from '@/components/LoadingIndicator'
import { useTheme } from '@/lib/theme'
import { googleIdToken } from '@/lib/googleSignIn'
import Toast from 'react-native-toast-message'

import { ApiRequestError, deleteAccount, linkGoogleAccount, logoutAccount, fetchLinkedDevices, revokeLinkedDevice, type LinkedDevice, type Settings } from '@/lib/api'

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
  const { colors } = useTheme()
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
  const loginInProgress = useRef(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [comparison, setComparison] = useState<AccountRecordComparison | null>(null)
  const pendingToken = useRef<string | null>(null)
  useEffect(() => () => { pendingToken.current = null }, [])
  function cancelComparison() { if (!linking) { pendingToken.current = null; setComparison(null); setLoginError(null) } }
  async function connect(token: string, choice?: AccountRecordChoice) {
    try {
      const settings = await linkGoogleAccount(token, choice)
      pendingToken.current = null; setComparison(null); onLinked(settings)
      Toast.show({ type: 'success', text1: '계정을 연결했어요', text2: '같은 계정으로 기록을 이어서 볼 수 있어요.' })
    } catch (error) {
      const records = error instanceof ApiRequestError ? accountRecordComparison(error.apiError) : null
      if (records) { pendingToken.current = token; setComparison(records); setLoginError(choice ? '기록이 변경됐어요. 최신 내용을 다시 확인해주세요.' : null); return }
      const message = error instanceof ApiRequestError ? accountRecordErrorMessage(error.apiError) : error instanceof Error ? error.message : '연결하지 못했어요. 잠시 후 다시 시도해주세요.'
      setLoginError(message)
      if (!pendingToken.current) Toast.show({ type: 'error', text1: '계정 연결을 확인해주세요', text2: message })
    }
  }
  async function confirmRecords(choice: AccountRecordChoice) {
    if (loginInProgress.current || !pendingToken.current) return
    loginInProgress.current = true; setLinking(true); setLoginError(null)
    try { await connect(pendingToken.current, choice) }
    finally { loginInProgress.current = false; setLinking(false) }
  }
  async function login() {
    if (loginInProgress.current || comparison) return
    loginInProgress.current = true
    setLinking(true); setLoginError(null)
    try {
      const token = await googleIdToken()
      if (!token) return
      await connect(token)
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.apiError.message : error instanceof Error ? error.message : '연결하지 못했어요. 잠시 후 다시 시도해주세요.'
      setLoginError(message)
      Toast.show({ type: 'error', text1: '계정 연결을 확인해주세요', text2: message })
    } finally { loginInProgress.current = false; setLinking(false) }
  }

  // Play 스토어 계정 삭제 요건(2026-10-06) — 연동 해제가 아니라 서버 쪽 계정 자체를 완전히 삭제.
  function handleDeletePress() {
    Alert.alert('FireWatch 계정을 삭제할까요?', 'FireWatch 계정·공유 설정·보유 기록과 이력·문의·공개 순위를 삭제하고 연결된 기기의 로그인을 해제해요. 되돌릴 수 없어요. Google 계정 자체는 삭제하지 않아요. 기기별 가상게임·보안 로그·백업은 자동 삭제되지 않으며 개인정보 안내에서 별도 삭제를 요청할 수 있어요.', [
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
        <Text className="text-center text-sm font-semibold text-primary">{linkedEmail} 계정과 연동되었습니다 ✓</Text>
        <Text className="text-xs text-muted">로그인은 30일간 유지되고, 만료되면 연결된 Google 계정으로 복구를 시도해요. 계정 확인이 필요하면 다시 로그인해주세요.</Text>
        <Pressable disabled={linking || deviceBusy || deleting} onPress={() => void login()} className="min-h-12 items-center justify-center">{linking ? <LoadingIndicator color={colors.primary} trackColor={colors.border} label="Google 로그인 확인 중" width={60} /> : <Text className="text-primary">Google 로그인 갱신</Text>}</Pressable>
        {loginError && !comparison && <Text accessibilityRole="alert" className="text-sm text-danger">{loginError}</Text>}
        <Pressable disabled={deviceBusy} onPress={manageDevices} className="min-h-12 items-center justify-center"><Text className="text-primary">연결된 기기 확인</Text></Pressable>
        {devices?.map((device, index) => <View key={device.id} className="rounded-xl border border-line p-3">
          <Text className="font-semibold text-ink">{device.current ? '현재 기기' : `연결 기기 ${index + 1}`}</Text>
          <Text className="text-xs text-muted">연결일 · {new Date(device.linkedAt).toLocaleDateString('ko-KR')}</Text>
          {!device.current && <Pressable disabled={deviceBusy} onPress={() => revokeDevice(device)} className="min-h-12 justify-center"><Text className="text-danger">연결 해제</Text></Pressable>}
        </View>)}
        <Pressable disabled={deviceBusy} onPress={logout} className="min-h-12 items-center justify-center"><Text className="text-muted">이 기기에서 로그아웃</Text></Pressable>
        <Pressable onPress={handleDeletePress} disabled={deleting} className="min-h-12 items-center justify-center py-2">
          {deleting ? <LoadingIndicator color={colors.primary} trackColor={colors.border} label="계정 삭제 처리 중" width={60} /> : <Text className="text-sm font-semibold text-danger">계정 삭제</Text>}
        </Pressable>
      </View>
    )
  }

  return (
    <View className="gap-2">{comparison && <AccountRecordLinkSheet key={comparison.fingerprint} comparison={comparison} busy={linking} error={loginError} close={cancelComparison} confirm={choice => void confirmRecords(choice)} />}<Pressable
      onPress={() => void login()}
      disabled={linking || !!comparison}
      className="flex-row items-center justify-center gap-2 rounded-full border border-line bg-surface py-3"
    >
      {linking ? (
        <LoadingIndicator color={colors.primary} trackColor={colors.border} label="Google 계정 연결 중" width={60} />
      ) : (
        <Text className="text-base font-semibold text-muted">Google 계정 연동</Text>
      )}
    </Pressable>{loginError && !comparison && <Text accessibilityRole="alert" className="text-sm text-danger">{loginError}</Text>}</View>
  )
}
