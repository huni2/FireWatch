import { useState } from 'react'
import { Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchSettings, updateSettings } from '@/lib/api'
import { catalogVerifiedAt, companies, companyNews, companySector, findCompany, isRecommended, portfolioContext, qualifiedRecommendations, recommendationFor, searchCompanies, sectors, type Company, type DiscoveryBriefing } from '../../../../shared/discovery'
import type { Portfolio } from '../../../../shared/investing'

interface Props { briefing?: DiscoveryBriefing | null; portfolio?: Portfolio | null; loading?: boolean; onOpenStock?: (symbol: string) => void; onOpenNews?: (query: string) => void; onOpenPortfolio?: () => void; onSearchStock?: (name: string) => void }
export function CompanyDiscovery({ briefing, portfolio, loading = false, onOpenStock, onOpenNews, onOpenPortfolio, onSearchStock }: Props) {
  const [sectorId, setSectorId] = useState('all')
  const [region, setRegion] = useState('all')
  const [query, setQuery] = useState('')
  const [onlyRecommended, setOnlyRecommended] = useState(false)
  const [selected, setSelected] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [watchFeedback, setWatchFeedback] = useState<{ symbol: string; message: string; failed: boolean } | null>(null)
  const picks = qualifiedRecommendations(briefing)
  const visible = searchCompanies(query, sectorId, region, onlyRecommended, briefing)
  const sector = sectors.find(item => item.id === sectorId)
  const detail = selected && recommendationFor(selected, briefing)
  const news = selected ? companyNews(selected, briefing) : []
  const openLink = (url: string) => { void Linking.openURL(url).catch(() => Toast.show({ type: 'error', text1: '링크를 열지 못했습니다.' })) }
  const watch = async (company: Company) => {
    setSaving(true)
    setWatchFeedback(null)
    try {
      const current = await fetchSettings()
      if (!current.watchedStocks.includes(company.symbol)) {
        if (current.watchedStocks.length >= 20) throw new Error('관심 종목은 최대 20개입니다.')
        await updateSettings({ watchedStocks: [...current.watchedStocks, company.symbol] })
      }
      Toast.show({ type: 'success', text1: `${company.name} 관심 종목 등록 완료` })
      setWatchFeedback({ symbol: company.symbol, message: '관심 종목에 저장했어요. 종목 화면에서 확인할 수 있어요.', failed: false })
    } catch (error) { const message = error instanceof Error ? error.message : '다시 시도해주세요.'; setWatchFeedback({ symbol: company.symbol, message, failed: true }); Toast.show({ type: 'error', text1: '관심 종목 저장 실패', text2: message }) }
    finally { setSaving(false) }
  }
  return <View className="gap-5">
    <View className="gap-2 rounded-xl border border-line bg-surface p-4"><Text className="text-xs font-semibold text-brand">FIND YOUR NEXT IDEA</Text><Text className="text-xl font-bold text-ink">분야를 이해하고, 기업을 발견하세요.</Text><Text className="text-muted">{sectors.length}개 분야 · 탐색 기업 {companies.length}개 · 근거 있는 후보 {picks.length}개</Text>{briefing && <Text className="text-xs text-muted">자료 기준 {briefing.briefingDate}</Text>}</View>
    <Text className="text-lg font-bold text-ink">브리핑이 고른 개별 종목</Text>
    {loading && !picks.length ? <Text className="text-muted">브리핑 추천 자료를 불러오는 중이에요. 분야와 기업은 먼저 탐색할 수 있어요.</Text> : picks.length ? picks.map(pick => {
      const company = findCompany(pick.stockName)
      return <View key={pick.stockName} className="gap-3 rounded-xl border border-line bg-surface p-4"><Text className="text-xs text-brand">AI 해석 · {briefing?.briefingDate}</Text><Text className="text-lg font-bold text-ink">{company?.name ?? pick.stockName}</Text><Text className="text-ink">{pick.reason}</Text><Text className="text-muted">확인할 위험 · {pick.risk}</Text><Pressable accessibilityRole="button" onPress={() => company ? setSelected(company) : onSearchStock?.(pick.stockName)} className="min-h-11 justify-center rounded-xl bg-neutral-100 p-3"><Text className="text-brand">{company ? '기업과 근거 살펴보기' : '종목명으로 확인'}</Text></Pressable></View>
    }) : <View className="rounded-xl border border-line bg-surface p-4"><Text className="text-ink">종목별 근거가 확인된 추천을 기다리고 있어요.</Text><Text className="mt-2 text-muted">기업 탐색은 계속할 수 있어요. 근거가 없는 과거 추천은 이 목록에 포함하지 않습니다.</Text></View>}
    <Text className="text-lg font-bold text-ink">어떤 분야가 궁금하세요?</Text>
    <View className="flex-row flex-wrap gap-2">{sectors.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: sectorId === item.id }} onPress={() => setSectorId(sectorId === item.id ? 'all' : item.id)} style={{ flexBasis: '48%', flexGrow: 1 }} className={`gap-2 rounded-xl border p-3 ${sectorId === item.id ? 'border-brand bg-orange-50' : 'border-line bg-surface'}`}><Text className="font-bold text-ink">{item.name}</Text><Text className="text-xs text-muted">{item.description}</Text><Text className="text-xs text-brand">기업 {companies.filter(company => company.sectorId === item.id).length}개</Text></Pressable>)}</View>
    <Text className="text-lg font-bold text-ink">{sector?.name ?? '분야별 기업'} · {visible.length}개</Text>
    <TextInput accessibilityLabel="기업과 분야 검색" placeholder="기업명·분야로 검색" value={query} onChangeText={setQuery} className="rounded-xl border border-line bg-surface p-3 text-ink" />
    <View className="flex-row flex-wrap gap-2">{[{ id: 'all', label: '전체' }, { id: 'KR', label: '한국' }, { id: 'US', label: '미국' }].map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: region === item.id }} key={item.id} onPress={() => setRegion(item.id)} className={`min-h-11 justify-center rounded-xl px-4 ${region === item.id ? 'bg-brand' : 'bg-neutral-100'}`}><Text className={region === item.id ? 'text-white' : 'text-ink'}>{item.label}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityState={{ selected: onlyRecommended }} onPress={() => setOnlyRecommended(!onlyRecommended)} className="min-h-11 justify-center rounded-xl bg-neutral-100 px-3"><Text className="text-brand">{onlyRecommended ? '✓ ' : ''}근거 있는 추천만</Text></Pressable></View>
    {sector && <View className="gap-2 rounded-xl border border-line bg-surface p-4"><Text className="font-bold text-ink">이 분야를 볼 때 확인할 것</Text>{sector.checks.map(check => <Text className="text-muted" key={check}>• {check}</Text>)}<Pressable accessibilityRole="button" onPress={() => onOpenNews?.(sector.keywords[0])} className="min-h-11 justify-center"><Text className="text-brand">이 분야 뉴스 보기 →</Text></Pressable></View>}
    {visible.map(company => <View key={company.symbol} className="gap-2 rounded-xl border border-line bg-surface p-4"><Text className="text-xs text-muted">{company.region === 'KR' ? '한국' : '미국'} · {companySector(company).name}</Text><Text className="text-lg font-bold text-ink">{company.name}</Text><Text className="text-xs text-muted">{isRecommended(company, briefing) ? ' · 브리핑 추천' : ''}{portfolio?.holdings.some(row => row.holding.symbol === company.symbol) ? ' · 보유 중' : ''}</Text><Text className="text-ink">{company.description}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${company.name} 기업 살펴보기`} onPress={() => setSelected(company)} className="min-h-11 justify-center rounded-xl bg-neutral-100 p-3"><Text className="text-brand">기업 살펴보기 →</Text></Pressable></View>)}
    {!visible.length && <Text className="text-muted">조건에 맞는 기업이 없어요. 분야나 국가 필터를 바꿔보세요.</Text>}
    <Pressable accessibilityRole="button" onPress={() => { setSectorId('all'); setRegion('all'); setQuery(''); setOnlyRecommended(false) }} className="min-h-11 justify-center"><Text className="text-brand">필터 초기화</Text></Pressable>
    <Text className="text-xs text-muted">공식 사업 소개 기반의 시작 목록입니다. 전체 상장기업 목록이나 추천 순위가 아닙니다. 정보 확인 {catalogVerifiedAt}.</Text>
    <Pressable accessibilityRole="button" onPress={() => onSearchStock?.(query)} className="min-h-11 justify-center"><Text className="text-brand">이 목록 외 기업 검색하기 →</Text></Pressable>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)} presentationStyle="pageSheet">
      {selected && <SafeAreaView className="flex-1 bg-canvas"><View className="flex-row items-center justify-between border-b border-line bg-surface px-5 py-3"><Text className="flex-1 text-lg font-bold text-ink">{selected.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="기업 상세 닫기" onPress={() => setSelected(null)} className="min-h-11 justify-center px-4"><Text className="text-brand">닫기</Text></Pressable></View><ScrollView contentContainerClassName="gap-5 p-5 pb-10">
        <Text className="text-muted">{companySector(selected).name}</Text><Text className="text-ink">{selected.description}</Text><Pressable accessibilityRole="link" onPress={() => openLink(selected.source)}><Text className="text-brand">공식 사업 소개 ↗</Text></Pressable>
        <Text className="text-lg font-bold text-ink">개별 종목 추천 근거</Text>
        {isRecommended(selected, briefing) && detail ? <View className="gap-3"><Text className="text-xs text-brand">AI 해석 · 자료 기준 {briefing?.briefingDate}</Text><Text className="text-ink">{detail.reason}</Text><Text className="text-muted">확인할 위험 · {detail.risk}</Text>{!detail.sourceNewsLinks.length && <Text className="text-xs text-muted">직접 연결된 근거 기사 없이 제공된 시장 자료에 대한 AI 해석입니다.</Text>}</View> : <Text className="text-muted">현재 근거가 확인된 추천 후보가 아닙니다. 기업과 뉴스를 탐색할 수 있습니다.</Text>}
        <Text className="text-lg font-bold text-ink">내 포트폴리오와 비교</Text><Text className="text-ink">{portfolioContext(selected, portfolio)}</Text><Pressable accessibilityRole="button" onPress={() => { setSelected(null); onOpenPortfolio?.() }} className="min-h-11 justify-center"><Text className="text-brand">내 보유 자산 확인 →</Text></Pressable>
        <Text className="text-lg font-bold text-ink">관련 기사와 근거 확인</Text>{news.length ? news.map(article => <Pressable key={article.link} accessibilityRole="link" onPress={() => openLink(article.link)} className="py-2"><Text className="text-brand">{article.title} ↗</Text></Pressable>) : <Text className="text-muted">저장된 브리핑에서 연결되는 기사가 없습니다.</Text>}
        <Pressable accessibilityRole="button" onPress={() => { const name = selected.name; setSelected(null); onOpenNews?.(name) }} className="min-h-11 justify-center"><Text className="text-brand">이 기업의 보관 뉴스 검색 →</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { const symbol = selected.symbol; setSelected(null); onOpenStock?.(symbol) }} className="min-h-11 justify-center rounded-xl bg-neutral-100 p-3"><Text className="text-ink">차트 보기</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={() => void watch(selected)} className="min-h-11 justify-center rounded-xl bg-brand p-3"><Text className="text-center text-white">{saving ? '저장 중...' : '관심 종목에 담기'}</Text></Pressable>
        {watchFeedback?.symbol === selected.symbol && <Text accessibilityRole="alert" className={watchFeedback.failed ? 'text-red-600' : 'text-brand'}>{watchFeedback.message}</Text>}
      </ScrollView></SafeAreaView>}
    </Modal>
  </View>
}
