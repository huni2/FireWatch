import { useEffect, useMemo, useState } from 'react'
import { Alert, Empty, Segmented, Skeleton, Typography } from 'antd'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { StockChartRange } from '../../../lib/api'
import { useStockHistory } from '../hooks/useStockHistory'
import { BRAND_GREEN } from '../../../lib/theme'
import { stockLabel } from '../../../../../shared/stock-labels'
import { formatStockPrice } from '../../../../../shared/stock-price'
import { CompanyNews } from './CompanyNews'

const CHART_COLOR = BRAND_GREEN

interface StockChartProps {
  symbol: string
  name?: string
  onNameFound?: (symbol: string, name: string) => void
  showNews?: boolean
}

const RANGE_OPTIONS: { label: string; value: StockChartRange }[] = [
  { label: '하루', value: '1d' },
  { label: '일주일', value: '1wk' },
  { label: '1개월', value: '1mo' },
  { label: '3개월', value: '3mo' },
  { label: '6개월', value: '6mo' },
  { label: '5년', value: '5y' },
]

function formatLabel(timestamp: string, range: StockChartRange): string {
  const d = new Date(timestamp)
  if (range === '1d') {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }
  if (range === '1wk') {
    return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (range === '5y') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Design Ref: llm-wiki/design.md §4 벤치마크 톤 — RateChart와 동일한 Area+그라디언트 스타일 재사용.
// 2026-08-21 사용자 요청 — "5년/6개월/3개월/1달/일주일/하루 이렇게 시간적으로 볼 수 있는 차트".
export function StockChart({ symbol, name = stockLabel(symbol), onNameFound, showNews = true }: StockChartProps) {
  const [range, setRange] = useState<StockChartRange>('6mo')
  const { data, loading, error } = useStockHistory(symbol, range)
  const currentData = data?.symbol === symbol ? data : null
  const companyName = name === '회사명 확인 필요' ? currentData?.companyName ?? name : name
  const latest = currentData?.points.at(-1)
  const price = currentData?.quotePrice ?? latest?.close
  const priceAt = currentData?.quotePrice != null ? currentData.quoteAt : latest?.timestamp
  const currency = currentData?.currency ?? (/\.K[QS]$/.test(symbol) ? 'KRW' : null)
  useEffect(() => {
    if (name === '회사명 확인 필요' && currentData?.companyName) onNameFound?.(symbol, currentData.companyName)
  }, [name, currentData?.companyName, symbol, onNameFound])

  const chartData = useMemo(
    () => (data?.points ?? []).map((point) => ({ label: formatLabel(point.timestamp, range), value: point.close })),
    [data, range],
  )

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>{companyName}</Typography.Title>
      {price != null && !error && <div style={{ marginBottom: 20 }}>
        <Typography.Text style={{ fontSize: 28, fontWeight: 700 }}>{formatStockPrice(price, currency)}</Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block' }}>{currentData?.quotePrice != null ? '최근 제공 시세' : '마지막 기록 가격'}{priceAt ? ` · ${new Date(priceAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국 시간)` : ''}</Typography.Text>
      </div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Segmented style={{ maxWidth: '100%', overflowX: 'auto' }} size="small" value={range} onChange={(value) => setRange(value as StockChartRange)} options={RANGE_OPTIONS} />
        {range === '1d' && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            30초마다 자동 갱신 — 완전한 실시간 스트리밍은 아니고 짧은 지연이 있습니다.
          </Typography.Text>
        )}
      </div>

      {loading && <Skeleton active paragraph={{ rows: 4 }} />}
      {!loading && error && (
        <Alert type="error" message={`${companyName} 시세를 불러오지 못했습니다`} description="잠시 후 다시 확인해주세요." showIcon />
      )}
      {!loading && !error && chartData.length === 0 && <Empty description="표시할 데이터가 없습니다" />}
      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="stockChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={60} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART_COLOR}
              strokeWidth={2}
              fill="url(#stockChartFill)"
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {showNews && companyName !== '회사명 확인 필요' && <div style={{ marginTop: 24 }}><CompanyNews key={companyName} name={companyName} /></div>}
    </div>
  )
}
