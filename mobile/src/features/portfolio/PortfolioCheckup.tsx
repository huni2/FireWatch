import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { ActionButton } from '@/components/ActionButton'
import { useTheme } from '@/lib/theme'
import type { Portfolio } from '../../../../shared/investing'
import { checkpointDate, portfolioCheckup, type CheckupFinding } from '../../../../shared/portfolio-checkup'

const actionLabels = { largest: '비중 계산 보기', index: 'ETF 지수명 비교', sector: '분야별 비중 보기', currency: '거래 통화 보기' }
const percent = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
export function PortfolioCheckup({ portfolio, busy, refreshing, onRefresh, onInspect, onEdit, onReview, onOpenStock, onOpenNews }: {
  portfolio: Portfolio; busy: boolean; refreshing: boolean; onRefresh: () => void; onInspect: (kind: CheckupFinding['kind']) => void; onEdit: (symbol: string) => void; onReview: () => void; onOpenStock?: (symbol: string) => void; onOpenNews?: (query: string) => void
}) {
  const { colors: c } = useTheme()
  const [findingsExpanded, setFindingsExpanded] = useState(false)
  const [changesExpanded, setChangesExpanded] = useState(false)
  const check = portfolioCheckup(portfolio)
  const total = check.complete ? portfolio.totalValueKrw : check.includedValue
  const panel = { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: 12 }
  return <View style={{ gap: 20 }}>
    <View style={{ gap: 8 }}><Text style={{ color: c.text, fontSize: 22, fontWeight: '700' }}>내 투자 점검</Text><Text style={{ color: c.muted, lineHeight: 22 }}>등록한 자산에서 확인할 점을 먼저 살펴보세요.</Text><ActionButton label={refreshing ? '자료 확인 중' : '자료 다시 확인'} busy={refreshing} disabled={busy || refreshing} onPress={onRefresh} /></View>
    <View accessibilityLabel="평가 자료 확인 상태" style={panel}>
      <Text style={{ color: c.muted }}>{check.complete ? '등록한 자산 평가액' : '확인된 자산과 현금 평가액 · 일부'}</Text><Text style={{ color: c.text, fontSize: 26, fontWeight: '700' }}>{check.pricedCount || portfolio.cash > 0 ? `${total?.toLocaleString('ko-KR')}원` : '평가 자료 확인 중'}</Text>
      <Text style={{ color: c.muted }}>보유 종목 {portfolio.holdings.length}개 · 가격·환율 확인 {check.pricedCount}개</Text><Text style={{ color: c.muted, fontSize: 13, lineHeight: 20 }}>{check.asOf}</Text><Text style={{ color: c.muted, fontSize: 13, lineHeight: 20 }}>증권사 자동 연동 없이 직접 기록한 보유 내역이에요. 매수·매도 후에는 현재 수량을 수정해주세요.</Text>
    </View>
    {check.missing.length > 0 && <View style={panel}>
      <Text style={{ color: c.text, fontWeight: '600' }}>{check.missing.length}개 종목의 평가 자료가 아직 없어요.</Text>
      <Text style={{ color: c.muted, lineHeight: 22 }}>{check.missing.slice(0, 3).map(row => `${row.holding.name} · ${row.currentPrice == null ? '시세 확인 필요' : '환율·평가액 확인 필요'}`).join(' / ')}{check.missing.length > 3 ? ` 외 ${check.missing.length - 3}개` : ''}</Text>
      <Text style={{ color: c.muted, lineHeight: 22 }}>전체 평가액을 확정하지 않았어요. 비중은 {check.basis}이에요. 다시 확인해도 시세가 준비되지 않으면 금액이 바로 표시되지 않을 수 있어요.</Text>
    </View>}
    {(check.stale.length > 0 || check.staleFx) && <View style={panel}><Text style={{ color: c.text, fontWeight: '600' }}>일부 시세·환율의 날짜를 확인해주세요.</Text><Text style={{ color: c.muted, lineHeight: 22 }}>{check.stale.length ? `${check.stale.slice(0, 3).map(row => row.holding.name).join(' · ')}의 시세 기준 날짜가 오래됐거나 확인이 필요해요. ` : ''}{check.staleFx ? '달러 환산에 사용한 환율 날짜도 확인이 필요해요. ' : ''}휴장일 여부와 기준 날짜를 함께 확인해주세요.</Text></View>}
    {check.findings.length > 0 ? <View accessibilityLabel="내 보유 자산에서 발견한 점" style={{ gap: 12 }}>{(findingsExpanded ? check.findings : check.findings.slice(0, 2)).map(finding => <View key={finding.kind} style={panel}>
      <Text style={{ color: c.muted, fontSize: 13 }}>{finding.kind === 'largest' ? '가장 큰 보유 비중' : finding.kind === 'index' ? '같은 지수명' : finding.kind === 'sector' ? '등록된 분야' : '거래 통화'}</Text><Text style={{ color: c.text, fontSize: 20, fontWeight: '700', lineHeight: 28 }}>{finding.title}</Text><Text style={{ color: c.muted, lineHeight: 22 }}>{finding.detail}</Text>
      <ActionButton label={actionLabels[finding.kind]} onPress={() => onInspect(finding.kind)} />{finding.symbol && onOpenStock && <Pressable accessibilityRole="button" onPress={() => onOpenStock(finding.symbol!)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.primary }}>종목 자료 보기 →</Text></Pressable>}
    </View>)}</View> : <View style={panel}><Text style={{ color: c.text, fontWeight: '600' }}>보유 기록은 저장됐어요.</Text><Text style={{ color: c.muted, lineHeight: 22 }}>{portfolio.holdings.length ? '평가 자료가 준비되면 가장 큰 보유 비중을 보여드릴게요. 지금도 수량과 관련 소식을 확인할 수 있어요.' : '현재는 현금 기록만 있어요. 보유 종목을 등록하면 비중과 관련 소식을 함께 점검할 수 있어요.'}</Text></View>}
    {check.findings.length > 2 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: findingsExpanded }} onPress={() => setFindingsExpanded(!findingsExpanded)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.primary }}>{findingsExpanded ? '추가 점검 접기' : `다른 확인할 점 ${check.findings.length - 2}개 보기`}</Text></Pressable>}
    {portfolio.reviewCheckpoint !== undefined && <View accessibilityLabel="지난 점검 이후 변화" style={panel}>
      <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>지난 점검 이후</Text>
      {check.checkpoint ? <>
        <Text style={{ color: c.muted, fontSize: 13 }}>기준 · {checkpointDate(check.checkpoint.reviewedAt)}</Text>
        <Text style={{ color: c.muted, fontSize: 13, lineHeight: 20 }}>이전 점검 자료 · {check.baselineAsOf}</Text>
        {check.recordChanges.length > 0 ? <><Text style={{ color: c.text, fontWeight: '600' }}>보유 기록이 달라졌어요.</Text>{(changesExpanded ? check.recordChanges : check.recordChanges.slice(0, 3)).map(change => <Text key={change} style={{ color: c.muted, lineHeight: 22 }}>{change}</Text>)}{check.recordChanges.length > 3 && !changesExpanded && <Text style={{ color: c.muted }}>외 {check.recordChanges.length - 3}개 기록 변경</Text>}</> : <Text style={{ color: c.muted, lineHeight: 22 }}>종목·수량·평균 구매 가격과 현금 기록은 그대로예요.</Text>}
        {check.canCompareWeights ? check.weightChanges.length ? <><Text style={{ color: c.text, fontWeight: '600' }}>보유 비중 변화</Text>{(changesExpanded ? check.weightChanges : check.weightChanges.slice(0, 3)).map(change => <Text key={change.symbol} style={{ color: c.text, lineHeight: 24 }}>{change.name} · {percent(change.before)}% → {percent(change.after)}% ({change.difference > 0 ? '+' : ''}{percent(change.difference)}%p)</Text>)}<Text style={{ color: c.muted, fontSize: 13, lineHeight: 20 }}>%p는 비중의 차이예요. 수익률이 아니며, 기록 수정·시세·환율 변화가 함께 반영돼요.</Text></> : <Text style={{ color: c.muted, lineHeight: 22 }}>확인된 자료에서 0.1%p 이상 달라진 종목 비중은 없어요.</Text> : <Text style={{ color: c.muted, lineHeight: 22 }}>이전 또는 현재 점검의 평가 자료가 부족해 비중 변화는 계산하지 않았어요.</Text>}
        {(check.recordChanges.length > 3 || check.weightChanges.length > 3) && <Pressable accessibilityRole="button" accessibilityState={{ expanded: changesExpanded }} onPress={() => setChangesExpanded(!changesExpanded)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.primary }}>{changesExpanded ? '변화 요약만 보기' : '지난 점검 변화 전체 보기'}</Text></Pressable>}
        <Text style={{ color: c.muted, lineHeight: 22 }}>현재 연결된 소식 중 지난 점검 뒤 발행된 새 자료 {check.newNewsCount}개</Text>
      </> : <Text style={{ color: c.muted, lineHeight: 22 }}>첫 점검을 마치면 다음 방문에서 보유 기록·비중·새 자료를 비교할 수 있어요.</Text>}
      <ActionButton tone="primary" label={check.checkpoint ? '이번 점검 마치기' : '첫 점검 마치기'} busy={busy} disabled={busy || refreshing} onPress={onReview} />
      <Text style={{ color: c.muted, fontSize: 13, lineHeight: 20 }}>현재 기록과 확인된 시세를 다음 비교 기준으로 저장해요. 보유 내역은 변경하지 않아요.</Text>
    </View>}
    <View accessibilityLabel="보유 종목 관련 소식" style={panel}>
      <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>보유 종목 관련 소식</Text>
      {check.news.length ? check.news.slice(0, 2).map(article => <View key={article.link} style={{ gap: 6, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 10 }}>
        <Text style={{ color: c.muted, fontSize: 13 }}>{article.isNew ? '지난 점검 이후 · ' : ''}{article.pubDate && Number.isFinite(Date.parse(article.pubDate)) ? new Date(article.pubDate).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '발행일 확인 필요'}</Text>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(article.link)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.primary, fontSize: 16, lineHeight: 24 }}>{article.title} ↗</Text></Pressable>
      </View>) : <Text style={{ color: c.muted, lineHeight: 22 }}>아직 연결된 소식이 없어요. 보유 종목 이름으로 저장 뉴스를 찾아볼 수 있어요.</Text>}
      {onOpenNews && <Pressable accessibilityRole="button" onPress={() => onOpenNews('')} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.primary }}>저장 뉴스 더 보기 →</Text></Pressable>}
      <Text style={{ color: c.muted, fontSize: 13, lineHeight: 20 }}>보유 종목 이름·별칭으로 연결한 자료예요. 관련성과 발행일을 확인해주세요.</Text>
    </View>
    {portfolio.holdings.length > 0 && <View style={{ gap: 8 }}><Text style={{ color: c.muted }}>매수·매도한 내역이 있나요?</Text>{portfolio.holdings.slice(0, 3).map(row => <ActionButton key={row.holding.symbol} disabled={busy} label={`${row.holding.name} 수량 수정`} onPress={() => onEdit(row.holding.symbol)} />)}</View>}
  </View>
}
