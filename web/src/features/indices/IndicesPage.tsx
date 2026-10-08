import { useState } from 'react'
import { Alert, Card, Segmented } from 'antd'
import { MetricStat } from './components/MetricStat'
import { RateChart } from './components/RateChart'
import { useBriefingHistory } from './hooks/useBriefingHistory'
import { useLatestBriefing } from '../dashboard/hooks/useLatestBriefing'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'
import type { Briefing } from '../../lib/api'

const metrics = [
  { key: 'kospi', label: '코스피', group: '주가지수' }, { key: 'kosdaq', label: '코스닥', group: '주가지수' }, { key: 'sp500', label: 'S&P 500', group: '주가지수' }, { key: 'nasdaq', label: '나스닥', group: '주가지수' }, { key: 'dow', label: '다우존스', group: '주가지수' },
  { key: 'usdKrw', label: '달러/원', group: '환율' }, { key: 'jpy100Krw', label: '100엔/원', group: '환율' }, { key: 'cnyKrw', label: '위안/원', group: '환율' },
  { key: 'goldPrice', label: '금 · USD/oz', group: '원자재·채권' }, { key: 'silverPrice', label: '은 · USD/oz', group: '원자재·채권' }, { key: 'usBondYield10y', label: '미국채 10년물 · %', group: '원자재·채권' }, { key: 'krBondYield10y', label: '한국국채 10년물 · %', group: '원자재·채권' },
] as const
export function IndicesPage() {
  const [period, setPeriod] = useState<7 | 30>(30)
  const [group, setGroup] = useState('주가지수')
  const [today] = useState(() => Date.now())
  const latest = useLatestBriefing()
  const history = useBriefingHistory(30)
  const sorted = [...(history.data ?? [])].sort((a, b) => b.briefingDate.localeCompare(a.briefingDate))
  const missing = latest.data ? metrics.filter(m => latest.data![m.key] == null).length : 12
  const available = (key: typeof metrics[number]['key']): Briefing | undefined => latest.data?.[key] != null ? latest.data : sorted.find(b => b[key] != null)
  const cutoff = new Date(today + 9 * 3600000 - (period - 1) * 86400000).toISOString().slice(0, 10)
  return <div className="market-page"><header className="compact-intro"><h2>시장 지표</h2><p>지표마다 마지막 유효 값과 날짜를 확인하세요. 실시간 시세가 아닙니다.</p></header>
    <SlowLoadingHint loading={latest.loading || history.loading} isSlow={latest.isSlow || history.isSlow} />
    {latest.error && <Alert type="error" message="최신 자료를 조회하지 못했습니다." description="조회 가능한 과거 기록이 있으면 기준 날짜와 함께 표시합니다." />}
    {history.error && <Alert type="warning" message="과거 지표를 조회하지 못했습니다." description="확인할 수 없는 이전 값을 임의로 채우지 않습니다." />}
    {!latest.loading && missing > 0 && <Alert type="warning" message={`${latest.data?.briefingDate ?? '최신 자료'} · ${missing}개 지표 미수집`} description="날짜가 최신이어도 모든 가격이 수집됐다는 뜻은 아닙니다. 아래 과거 값은 표시된 날짜의 기록입니다." />}
    <Segmented aria-label="시장 지표 종류" value={group} onChange={v => setGroup(String(v))} options={['주가지수', '환율', '원자재·채권']} />
    <div className="market-layout"><div className="market-metric-grid">{metrics.filter(m => m.group === group).map((m, i) => {
      const record = available(m.key), value = record?.[m.key] ?? null
      const previous = record && sorted.find(b => b.briefingDate < record.briefingDate && b[m.key] != null)
      const note = record ? `${record.briefingDate} 기준 · ${record.briefingDate === latest.data?.briefingDate ? '최신 기록' : '과거 기록'}` : history.loading ? '기록 확인 중' : '값을 확인할 수 없습니다.'
      return <div key={m.key} className="metric-with-status">{value == null && !history.loading ? <Card size="small" title={m.label}><strong>미수집</strong><p>최근 30일 조회 범위에 유효한 기록이 없습니다.</p><small className="metric-record-note">{note}</small></Card> : <MetricStat index={i} title={m.label} value={value} previousValue={previous?.[m.key]} precision={m.key.includes('Yield') ? 3 : 2} note={note} />}</div>
    })}</div><div className="market-chart"><RateChart key={group} initialMetric={group === '주가지수' ? 'kospi' : group === '환율' ? 'usdKrw' : 'goldPrice'} history={(history.data ?? []).filter(b => b.briefingDate >= cutoff)} loading={history.loading} period={period} onPeriodChange={setPeriod} /><p className="catalog-note">차트는 저장된 날짜의 유효 값입니다. 수집이 없는 날짜는 기록이 비어 있습니다.</p></div></div>
  </div>
}
