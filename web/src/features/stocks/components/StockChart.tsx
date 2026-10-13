import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Empty, Segmented, Skeleton, Typography, theme } from 'antd'
import { Line, LineChart, ReferenceLine, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { StockChartRange } from '../../../lib/api'
import { useStockHistory } from '../hooks/useStockHistory'
import { stockLabel } from '../../../../../shared/stock-labels'
import { formatStockPrice, stockPriceWindow, formatPriceChange } from '../../../../../shared/stock-price'
import { CompanyNews } from './CompanyNews'
import { SlowLoadingHint } from '../../../components/SlowLoadingHint'

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

// Price history uses a line and the period's first-price baseline, not a filled balance area.
// 2026-08-21 사용자 요청 — "5년/6개월/3개월/1달/일주일/하루 이렇게 시간적으로 볼 수 있는 차트".
export function StockChart({ symbol, name = stockLabel(symbol), onNameFound, showNews = true }: StockChartProps) {
  const { token } = theme.useToken()
  const [range, setRange] = useState<StockChartRange>('6mo')
  const { data, loading, error, isSlow, reload } = useStockHistory(symbol, range)
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
    () => (currentData?.points ?? []).filter(point => Number.isFinite(point.close) && point.close > 0).map((point) => ({ label: formatLabel(point.timestamp, range), value: point.close })),
    [currentData, range],
  )
  const window = stockPriceWindow(chartData.map(point => point.value), currency)
  const lineColor = window?.direction === 'up' ? token.colorError : window?.direction === 'down' ? token.colorInfo : token.colorTextSecondary

  return (
    <div className="company-chart-content">
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>{companyName}</Typography.Title>
      {price != null && !error && <div className="company-quote" style={{ marginBottom: 12 }}>
        <Typography.Text style={{ fontSize: 28, fontWeight: 700 }}>{formatStockPrice(price, currency)}</Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block' }}>{currentData?.quotePrice != null ? '최근 제공 시세' : '마지막 기록 가격'}{priceAt ? ` · ${new Date(priceAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국 시간)` : ''}</Typography.Text>
      </div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Segmented aria-label="주가 조회 기간" style={{ maxWidth: '100%', overflowX: 'auto' }} size="small" value={range} onChange={(value) => setRange(value as StockChartRange)} options={RANGE_OPTIONS} />
        {range === '1d' && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            30초마다 자동 갱신 — 완전한 실시간 스트리밍은 아니고 짧은 지연이 있습니다.
          </Typography.Text>
        )}
      </div>

      {loading && <Skeleton active paragraph={{ rows: 4 }} />}
      <SlowLoadingHint loading={loading} isSlow={isSlow} />
      {!loading && error && (
        <Alert type="error" message={`${companyName} 시세를 불러오지 못했습니다`} description="보유 기록은 유지돼요. 시세를 다시 불러와주세요." showIcon action={<Button onClick={reload}>시세 다시 확인</Button>} />
      )}
      {!loading && !error && chartData.length === 0 && <Empty description="표시할 데이터가 없습니다" />}
      {!loading && !error && chartData.length === 1 && <Typography.Text type="secondary">가격 기록이 1개예요. 더 모이면 상승·하락 흐름을 볼 수 있어요.</Typography.Text>}
      {!loading && !error && chartData.length > 1 && window && (
        <><Typography.Text style={{ display: 'block', color: lineColor, fontWeight: 600 }}>{formatPriceChange(window.change, window.percent, currency)}</Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>점선은 선택 기간 첫 가격이에요.</Typography.Text>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={value => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: currency === 'KRW' ? 0 : 2 })} domain={[window.minimum, window.maximum]} allowDataOverflow axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={76} />
            <ReferenceLine y={window.first} stroke={token.colorTextSecondary} strokeDasharray="4 4" />
            <Tooltip formatter={(value) => [formatStockPrice(Number(value), currency), "주가"]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
            <Line
              type="linear"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer></>
      )}
      {showNews && companyName !== '회사명 확인 필요' && <div style={{ marginTop: 24 }}><CompanyNews key={companyName} name={companyName} /></div>}
    </div>
  )
}
