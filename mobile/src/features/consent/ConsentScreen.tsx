import { ModalHeader } from '@/components/ModalHeader'
import { useTheme, ThemeSurface } from '@/lib/theme'
// 최초 동의와 개인정보 전문 읽기를 앱 안에서 완료하며 동의 전 서버 등록은 시작하지 않는다.
import { useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { InfoDocument } from '../help/InfoDocument'
import { FirewatchBrand } from '@/components/FirewatchBrand'
import { LoadingState } from '@/components/LoadingState'
import { ThemeToggle } from '@/components/ThemeToggle'

interface ConsentScreenProps {
  onAgree: () => void | Promise<void>
}

export function ConsentScreen({ onAgree }: ConsentScreenProps) {
  const { colors } = useTheme()
  const [checked, setChecked] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const pending = useRef(false)
  async function agree() {
    if (!checked || pending.current) return
    pending.current = true
    setSaving(true); setSaveError(false)
    try { await onAgree() }
    catch { setSaveError(true) }
    finally { pending.current = false; setSaving(false) }
  }

  if (saving) return <SafeAreaProvider><SafeAreaView style={{ flex: 1 }}><LoadingState startup message="이용 설정을 저장하고 있어요" /></SafeAreaView></SafeAreaProvider>
  return (
    <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}><ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-5">
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-2"><View className="flex-row items-center gap-2"><FirewatchBrand size={36} /><Text className="text-lg font-bold text-ink">FireWatch</Text></View><ThemeToggle /></View>
        <Text className="text-2xl font-bold leading-8 text-ink">내 투자 기록을{ '\n' }한눈에 살펴보세요</Text>
        <Text className="text-sm font-semibold text-muted">시작하기 전에 · 자료 보관 안내</Text>
        <Text className="text-base leading-6 text-muted">
          직접 입력한 투자 기록과 관심 기업을 저장해 점검에 사용해요. Google 계정 연결과 알림은 선택이며, 알림을 켜면 푸시 토큰을 사용해요. 어떤 자료를 보관하는지 아래에서 확인할 수 있어요.
        </Text>
        <Pressable accessibilityRole="button" accessibilityHint="앱 안에서 전문을 읽고 이 화면으로 돌아옵니다." onPress={() => setPolicyOpen(true)} className="min-h-12 justify-center">
          <Text className="text-base font-semibold text-primary underline">개인정보처리방침 전문 보기</Text>
        </Pressable>
      </View>

      <View className="gap-3 border-t border-line pt-4">
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled: saving }} disabled={saving} onPress={() => setChecked((value) => !value)} className="min-h-12 flex-row items-center gap-3">
          <View
            className={`h-6 w-6 items-center justify-center rounded border ${
              checked ? 'border-primary bg-selection' : 'border-neutral-400'
            }`}
          >
            {checked && <Text className="text-sm font-bold text-onselection">✓</Text>}
          </View>
          <Text className="flex-1 text-base text-ink">
            (필수) 개인정보 수집·이용 및 개인정보처리방침에 동의합니다.
          </Text>
        </Pressable>
        {saveError && <Text accessibilityRole="alert" className="text-base leading-6 text-danger">동의 설정을 저장하지 못했어요. 다시 눌러주세요.</Text>}
        <Pressable
          onPress={() => { void agree() }}
          accessibilityRole="button"
          accessibilityState={{ disabled: !checked || saving, busy: saving }}
          disabled={!checked || saving}
          className={`items-center rounded-full border py-4 ${checked ? 'bg-selection border-primary' : 'bg-surface border-line'}`}
        >
          <Text className={`text-base font-bold ${checked ? 'text-onselection' : 'text-muted'}`}>{saving ? '설정 저장 중…' : '동의하고 시작하기'}</Text>
        </Pressable>
      </View>
    </ScrollView></SafeAreaView>
      <Modal visible={policyOpen} animationType="slide" onRequestClose={() => setPolicyOpen(false)}><ThemeSurface>
        <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
          <ModalHeader title="개인정보처리방침" close={() => setPolicyOpen(false)} />
          <ScrollView style={{ flex: 1 }} contentContainerClassName="p-5 pb-10"><InfoDocument kind="privacy" /></ScrollView>
        </SafeAreaView></SafeAreaProvider>
      </ThemeSurface></Modal>
    </SafeAreaProvider>
  )
}
