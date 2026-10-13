// 모바일의 실제 메뉴·조작에 맞는 도움말을 앱 안에서 제공한다.
import { useState } from 'react'
import { Link } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'

const topics = [
  ['내 자산을 어떻게 등록하나요?', '하단 ‘내 기록’에서 자산 등록을 눌러 회사명, 수량, 매입가를 입력하세요. 보유 내역은 직접 입력하며 실제 주문이나 증권사 자동 연동은 제공하지 않아요.'],
  ['투자가 몰린 곳을 어디서 보나요?', '내 기록의 자산 요약과 분야·통화 비중을 살펴보세요. 시세가 없는 자산은 평가에서 빠질 수 있으니 안내와 자료 기준 날짜도 확인해주세요.'],
  ['회사 가격과 관련 소식을 보고 싶어요.', '하단 ‘기업 탐색’의 회사 검색·시세에서 회사 이름을 검색하세요. 회사 상세에서 가격, 차트와 관련 뉴스를 볼 수 있어요. 뉴스 원문과 회사 공식 자료는 외부 브라우저에서 열려요.'],
  ['AI 분석을 그대로 따라도 되나요?', 'AI 분석은 참고 자료예요. 추천 이유와 위험 요인, 분석 기준 날짜, 원문을 함께 확인해주세요. 수익을 보장하지 않으며 원금 손실 가능성이 있어요.'],
  ['게임은 실제 투자와 어떻게 다른가요?', '하단 ‘게임’에서 게임머니로 연습해요. 회사 이름은 실제 기업을 쓰지만 가격·뉴스·픽은 가상이에요. 24주를 마치면 결과를 확인하고 순위 등록을 선택할 수 있어요. 내 기록의 실제 보유 자산과는 별도로 관리돼요.'],
  ['알림 시간과 계정은 어디서 바꾸나요?', '상단 설정에서 Google 계정 연결과 브리핑 수신 시간을 관리하세요. 수신 시간은 한국 시간 기준이며 서버 처리와 기기 상태에 따라 늦어질 수 있어요. 같은 계정의 설정은 공유되지만 알림 권한은 기기마다 확인해야 해요.'],
  ['문제 신고와 계정 삭제는 어떻게 하나요?', '설정의 ‘공지·의견 보내기’에서 문제와 의견을 제출하고 답변을 확인하세요. 연결한 계정 삭제는 설정에서 진행할 수 있어요. 앱 삭제만으로 서버 기록이 삭제되지는 않아요.'],
]

export function HelpScreen() {
  const [opened, setOpened] = useState<number | null>(0)
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-5 pb-12">
    <Text className="text-base leading-6 text-muted">하려는 일을 골라보세요. 안내를 읽고 뒤로가면 보던 화면으로 돌아가요.</Text>
    {topics.map(([title, answer], index) => <View key={title} className="rounded-2xl bg-surface p-4">
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: opened === index }} onPress={() => setOpened(opened === index ? null : index)} className="min-h-12 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-base font-bold text-ink">{title}</Text><Text className="text-xl text-muted">{opened === index ? '−' : '+'}</Text>
      </Pressable>
      {opened === index && <Text className="pt-3 text-base leading-7 text-ink">{answer}</Text>}
    </View>)}
    <Link href="/privacy" className="py-3 text-base font-semibold text-brand">개인정보처리방침</Link>
    <Link href="/investment-info" className="py-3 text-base font-semibold text-brand">투자 정보 이용안내</Link>
    <Link href="/community" className="py-3 text-base font-semibold text-brand">공지·의견 보내기</Link>
  </ScrollView>
}
