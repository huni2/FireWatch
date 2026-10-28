// 앱 설정에서 전문을 다시 읽고 시스템 뒤로가기로 이전 화면에 복귀한다.
import { Link } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { InfoDocument } from './InfoDocument'

export function InfoScreen({ kind }: { kind: 'privacy' | 'investment' }) {
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-6 p-5 pb-12">
    <InfoDocument kind={kind} />
    {kind === 'privacy' && <View className="gap-2 border-t border-line pt-5">
      <Text className="text-base leading-6 text-muted">계정 삭제는 설정에서 진행할 수 있어요. 로그인할 수 없거나 기기별 기록을 삭제하려면 위 문의처로 요청해주세요.</Text>
      <Link href="/settings" accessibilityRole="link" className="py-3 text-base font-semibold text-primary">계정·설정으로 이동</Link>
    </View>}
    <Link href="/community" accessibilityRole="link" className="py-3 text-base font-semibold text-primary">공지·의견 보내기</Link>
  </ScrollView>
}
