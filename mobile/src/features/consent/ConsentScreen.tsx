// 최초 실행 시 개인정보 이용에 동의해야 앱을 쓸 수 있게 막는 화면. 전문은 웹의 PrivacyPage
// (web/src/features/privacy/PrivacyPage.tsx)를 그대로 가리킨다 — 네이티브로 중복 작성하지 않음.
import { useState } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'

const PRIVACY_POLICY_URL = 'https://firewatch-eqp.pages.dev/privacy'

interface ConsentScreenProps {
  onAgree: () => void
}

export function ConsentScreen({ onAgree }: ConsentScreenProps) {
  const [checked, setChecked] = useState(false)

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="flex-grow justify-between p-6">
      <View className="gap-4">
        <Text className="text-2xl font-extrabold text-ink">시작하기 전에</Text>
        <Text className="text-base leading-6 text-muted">
          FireWatch는 매일 아침 증시 브리핑을 보내드리기 위해 기기 식별자와 푸시 알림 토큰, 회원님이 설정한 관심
          종목·키워드를 수집·저장합니다. 비밀번호·실명·결제 정보는 수집하지 않습니다.
        </Text>
        <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <Text className="text-base font-semibold text-brand underline">개인정보처리방침 전문 보기</Text>
        </Pressable>
      </View>

      <View className="gap-4">
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setChecked((value) => !value)} className="min-h-11 flex-row items-center gap-3">
          <View
            className={`h-6 w-6 items-center justify-center rounded border ${
              checked ? 'border-brand bg-brand' : 'border-neutral-400'
            }`}
          >
            {checked && <Text className="text-sm font-bold text-white">✓</Text>}
          </View>
          <Text className="flex-1 text-base text-ink">
            (필수) 개인정보 수집·이용 및 개인정보처리방침에 동의합니다.
          </Text>
        </Pressable>
        <Pressable
          onPress={onAgree}
          disabled={!checked}
          className={`items-center rounded-full py-4 ${checked ? 'bg-brand' : 'bg-neutral-300'}`}
        >
          <Text className="text-base font-bold text-white">동의하고 시작하기</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}
