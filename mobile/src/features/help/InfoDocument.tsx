// 최초 동의 전에도 네트워크·기기 등록 없이 앱에서 읽을 수 있는 안내 전문이다.
import { Text, View } from 'react-native'
import policy from '../../../../shared/privacy-policy.json'
import { investmentNotice } from '../../../../shared/investmentNotice'

export function InfoDocument({ kind }: { kind: 'privacy' | 'investment' }) {
  if (kind === 'privacy') return <View className="gap-5">
    <Text className="text-sm text-muted">시행일자: {policy.effectiveDate}</Text>
    <Text className="text-base leading-7 text-ink">{policy.intro}</Text>
    {policy.sections.map(section => <View key={section.title} className="gap-3">
      <Text accessibilityRole="header" className="text-lg font-bold text-ink">{section.title}</Text>
      {section.blocks.map((block, index) => <Text key={index} selectable className="text-base leading-7 text-ink">{block.kind === 'bullet' ? '• ' : ''}{block.text}</Text>)}
    </View>)}
  </View>
  return <View className="gap-5">
    <Text className="text-sm text-muted">안내 기준일: {investmentNotice.version}</Text>
    {[
      ['AI 분석과 투자 후보', `${investmentNotice.title} ${investmentNotice.summary}\n\n${investmentNotice.limitations}`],
      ['내 포트폴리오', `${investmentNotice.portfolio}\n\n보유 비중과 비교 정보는 입력한 자료를 바탕으로 계산하며, 누락된 자산과 미확인 시세는 전체 위험을 반영하지 못합니다. ISA·연금·ETF 조건은 금융회사와 운용사의 최신 설명서를 확인하세요.`],
      ['가상투자 게임', investmentNotice.game],
      ['투자 전에 확인하세요', '1. 자료의 기준 날짜와 분석 시각을 확인하세요.\n2. 추천 이유뿐 아니라 위험 요인과 연결된 기사 원문을 읽으세요.\n3. 공시·상품 설명서·실제 거래 시세를 별도로 확인하세요.\n4. 투자 금액과 손실을 감당할 수 있는 범위를 스스로 판단하세요.'],
    ].map(([title, text]) => <View key={title} className="gap-3"><Text accessibilityRole="header" className="text-lg font-bold text-ink">{title}</Text><Text selectable className="text-base leading-7 text-ink">{text}</Text></View>)}
    <Text className="text-base leading-7 text-ink">{investmentNotice.responsibility}</Text>
    <Text selectable className="text-base leading-7 text-muted">자료 오류나 잘못된 분석은 앱의 ‘공지·의견 보내기’에서 화면과 기준 날짜를 알려주세요. 비밀번호나 로그인 토큰은 보내지 마세요.</Text>
  </View>
}
