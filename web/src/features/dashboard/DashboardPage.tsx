import { useState } from 'react'
import { Alert, Empty, Row, Col, Space, Typography } from 'antd'
import { BriefingSummaryCard } from './components/BriefingSummaryCard'
import { MetricStat } from './components/MetricStat'
import { RateChart } from './components/RateChart'
import { RelatedNewsCard } from './components/RelatedNewsCard'
import { WatchlistSummaryCard } from './components/WatchlistSummaryCard'
import { useLatestBriefing } from './hooks/useLatestBriefing'
import { useBriefingHistory } from './hooks/useBriefingHistory'

// Design Ref: §5.4 Dashboard 체크리스트 — FR-04
export function DashboardPage() {
  const [period, setPeriod] = useState<7 | 30>(30)
  const latest = useLatestBriefing()
  const history = useBriefingHistory(period)

  const sortedHistory = [...(history.data ?? [])].sort((a, b) => b.briefingDate.localeCompare(a.briefingDate))
  const previous = sortedHistory.find((b) => b.briefingDate !== latest.data?.briefingDate) ?? null
  const lastAvailableDate = sortedHistory[0]?.briefingDate ?? null

  if (latest.error) {
    return <Alert type="error" message="브리핑을 불러오지 못했습니다" description={latest.error.message} showIcon />
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {!latest.loading && !latest.data && (
        <Empty
          description={
            lastAvailableDate
              ? `오늘자 브리핑이 아직 생성되지 않았습니다. 마지막 브리핑: ${lastAvailableDate}`
              : '아직 생성된 브리핑이 없습니다.'
          }
        />
      )}

      <BriefingSummaryCard briefing={latest.data} loading={latest.loading} />

      <WatchlistSummaryCard />

      {(latest.loading || latest.data) && (
        <RelatedNewsCard news={latest.data?.news ?? []} loading={latest.loading} />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat
            index={0}
            title="금(USD/oz)"
            value={latest.data?.goldPrice ?? null}
            previousValue={previous?.goldPrice}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat
            index={1}
            title="은(USD/oz)"
            value={latest.data?.silverPrice ?? null}
            previousValue={previous?.silverPrice}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat index={2} title="USD/KRW" value={latest.data?.usdKrw ?? null} previousValue={previous?.usdKrw} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat
            index={3}
            title="JPY(100)/KRW"
            value={latest.data?.jpy100Krw ?? null}
            previousValue={previous?.jpy100Krw}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat index={4} title="CNY/KRW" value={latest.data?.cnyKrw ?? null} previousValue={previous?.cnyKrw} />
        </Col>
      </Row>

      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
        국내외 지수 · 채권
      </Typography.Text>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat index={5} title="코스피" value={latest.data?.kospi ?? null} previousValue={previous?.kospi} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat index={6} title="코스닥" value={latest.data?.kosdaq ?? null} previousValue={previous?.kosdaq} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat index={7} title="S&P500" value={latest.data?.sp500 ?? null} previousValue={previous?.sp500} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat index={8} title="나스닥" value={latest.data?.nasdaq ?? null} previousValue={previous?.nasdaq} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat index={9} title="다우존스" value={latest.data?.dow ?? null} previousValue={previous?.dow} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <MetricStat
            index={10}
            title="미국채 10년물(%)"
            value={latest.data?.usBondYield10y ?? null}
            previousValue={previous?.usBondYield10y}
            precision={3}
          />
        </Col>
      </Row>

      <RateChart history={history.data ?? []} loading={history.loading} period={period} onPeriodChange={setPeriod} />
    </Space>
  )
}
