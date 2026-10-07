import { Linking, Pressable, Text, View } from 'react-native'
import { useState } from 'react'
import { fetchRecommendations } from '@/lib/investingApi'
import { useResource } from '@/lib/useResource'
import { fetchSettings } from '@/lib/api'
import type { Portfolio } from '../../../../shared/investing'
import { investmentFocus, focusPortfolioContext, focusRecommendation, focusNews } from '../../../../shared/investment-focus'
import { useStockNames } from '../stocks/hooks/useStockNames'

export function InvestmentFocus({ portfolio, onOpenStock, onOpenNews, onOpenCandidates }: { portfolio: Portfolio | null; onOpenStock?: (symbol: string) => void; onOpenNews?: (query: string) => void; onOpenCandidates?: () => void }) {
  const settings = useResource(fetchSettings)
  const report = useResource(fetchRecommendations)
  const { names } = useStockNames()
  const rows = investmentFocus(settings.data?.watchedStocks ?? [], portfolio, names)
  const [page, setPage] = useState(0)
  const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / 6) - 1))
  return <View className="gap-3 rounded-xl border border-line bg-surface p-4">
    <View className="flex-row items-center justify-between"><Text className="text-lg font-semibold text-ink">내 기업 점검</Text><Pressable accessibilityRole="button" onPress={() => { void settings.reload(); void report.reload() }} className="min-h-11 justify-center"><Text className="text-brand">새로고침</Text></Pressable></View>
    <Text className="text-sm text-muted">관심 기업과 보유 주식의 뉴스·근거를 확인하고 내 투자 구성과 비교하세요.</Text>
    {settings.error && <Pressable accessibilityRole="button" onPress={settings.reload}><Text className="text-brand">관심 기업 조회 실패 · 다시 시도</Text></Pressable>}
    {report.error && <Pressable accessibilityRole="button" onPress={report.reload}><Text className="text-brand">추천 분석 조회 실패 · 다시 시도</Text></Pressable>}
    {!rows.length && <Text className="text-muted">{settings.loading ? '관심 기업 확인 중' : '지켜볼 회사부터 골라보세요.'}</Text>}
    {rows.slice(currentPage * 6, currentPage * 6 + 6).map(row => {
      const pick = report.error ? null : focusRecommendation(row.symbol, row.name, report.data)
      const news = focusNews(row.symbol, row.name, report.data)
      return <View key={row.symbol} className="gap-2 rounded-xl border border-line p-3">
        <Text className="font-semibold text-ink">{row.name} · {row.held ? '보유' : '관심'}{row.held && row.watched ? ' · 관심' : ''}</Text>
        <Text className="text-sm text-ink">{focusPortfolioContext(row.symbol, portfolio)}</Text>
        {report.loading ? <Text className="text-muted">추천 근거 확인 중</Text> : pick ? <><Text className="text-xs text-brand">근거 있는 후보 · {report.data?.briefingDate}</Text><Text className="text-sm text-ink">{pick.reason}</Text><Text className="text-sm text-muted">확인할 위험 · {pick.risk}</Text></> : <Text className="text-xs text-muted">{report.error ? '추천 분석 확인 필요' : '현재 근거가 확인된 추천은 없습니다.'}</Text>}
        {!report.loading && !report.error && !!news.length && <><Text className="text-xs text-muted">분석 자료에 포함된 관련 기사 · {report.data?.briefingDate}</Text>{news.map(article => <Pressable accessibilityRole="link" key={article.link} onPress={() => Linking.openURL(article.link)} className="min-h-11 justify-center"><Text className="text-brand">{article.title} ↗</Text></Pressable>)}</>}
        <View className="flex-row flex-wrap gap-3">
          {onOpenStock && <Pressable accessibilityRole="button" onPress={() => onOpenStock(row.symbol)} className="min-h-11 justify-center"><Text className="text-brand">가격·차트·근거 →</Text></Pressable>}
          {onOpenNews && row.name !== '회사명 확인 필요' && <Pressable accessibilityRole="button" onPress={() => onOpenNews(row.name)} className="min-h-11 justify-center"><Text className="text-brand">저장된 뉴스 →</Text></Pressable>}
        </View>
      </View>
    })}
    {rows.length > 6 && <View className="flex-row items-center justify-between"><Pressable accessibilityRole="button" disabled={currentPage === 0} onPress={() => setPage(currentPage - 1)} className="min-h-11 justify-center"><Text className={currentPage === 0 ? 'text-muted' : 'text-brand'}>이전 기업</Text></Pressable><Text className="text-muted">{currentPage + 1} / {Math.ceil(rows.length / 6)}</Text><Pressable accessibilityRole="button" disabled={(currentPage + 1) * 6 >= rows.length} onPress={() => setPage(currentPage + 1)} className="min-h-11 justify-center"><Text className={(currentPage + 1) * 6 >= rows.length ? 'text-muted' : 'text-brand'}>다음 기업</Text></Pressable></View>}
    {onOpenCandidates && <Pressable accessibilityRole="button" onPress={onOpenCandidates} className="min-h-11 justify-center"><Text className="text-brand">다른 기업·분야 탐색 →</Text></Pressable>}
    <Text className="text-xs text-muted">뉴스와 AI 해석은 참고 자료이며 가격 변동 원인이나 수익을 보장하지 않습니다.</Text>
  </View>
}
