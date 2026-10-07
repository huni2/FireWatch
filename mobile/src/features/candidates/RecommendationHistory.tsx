import { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from 'react-native'
import { fetchRecommendationHistory } from '@/lib/investingApi'
import { qualifiedRecommendations, type RecommendationReport } from '../../../../shared/discovery'

export function RecommendationHistory() {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<RecommendationReport[]>([]), [selected, setSelected] = useState<RecommendationReport | null>(null)
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [error, setError] = useState<string | null>(null)
  const load = async () => {
    setOpen(true); setBusy(true); setError(null)
    try { const reports = await fetchRecommendationHistory(from || undefined, to || undefined); setRows(reports); setSelected(reports[0] ?? null) }
    catch (e) { setError(e instanceof Error ? e.message : '이력 조회 실패') }
    finally { setBusy(false) }
  }
  return <View className="gap-3 rounded-xl border border-line bg-surface p-4">
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => open ? setOpen(false) : void load()} className="min-h-11 justify-center"><Text className="text-lg font-semibold text-ink">추천 분석 보관함 · {open ? '접기' : '날짜별 근거 보기'}</Text></Pressable>
    <Text className="text-sm text-muted">분석 당시 기록을 보존하고, 기업과 기사 연결을 확인한 후보의 이유·위험을 보여줍니다.</Text>
    {open && <>
      <TextInput accessibilityLabel="추천 분석 시작일" placeholder="시작일 YYYY-MM-DD (선택)" value={from} onChangeText={setFrom} className="rounded-lg border border-line p-3 text-ink" />
      <TextInput accessibilityLabel="추천 분석 종료일" placeholder="종료일 YYYY-MM-DD (선택)" value={to} onChangeText={setTo} className="rounded-lg border border-line p-3 text-ink" />
      <Pressable disabled={busy} onPress={() => void load()} className="min-h-11 justify-center"><Text className="text-brand">이력 조회</Text></Pressable>
      {busy && <ActivityIndicator />}{error && <Text className="text-red-600">{error}</Text>}
      {!busy && !rows.length && <Text className="text-muted">이 기간에 저장된 추천 분석이 없습니다.</Text>}
      <View className="flex-row flex-wrap gap-2">{rows.map(row => <Pressable key={row.briefingDate} onPress={() => setSelected(row)} className={`min-h-11 justify-center rounded-lg px-3 ${selected?.briefingDate === row.briefingDate ? 'bg-brand' : 'bg-neutral-100'}`}><Text className={selected?.briefingDate === row.briefingDate ? 'text-white' : 'text-ink'}>{row.briefingDate} · {row.recommendedStocks.length}개</Text></Pressable>)}</View>
      {selected && qualifiedRecommendations(selected).map(pick => <View key={pick.stockName} className="gap-2 border-t border-line pt-3"><Text className="font-semibold text-ink">{pick.stockName}</Text><Text className="text-ink">{pick.reason}</Text><Text className="text-muted">확인할 위험 · {pick.risk}</Text>{pick.sourceNewsLinks.map(link => <Pressable key={link} onPress={() => void Linking.openURL(link).catch(() => setError('기사 링크를 열지 못했습니다.'))}><Text className="text-brand">{selected.news.find(article => article.link === link)?.title ?? '분석에 사용한 기사'}</Text></Pressable>)}</View>)}
    </>}
  </View>
}
