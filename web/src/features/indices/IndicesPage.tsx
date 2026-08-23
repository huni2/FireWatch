import { useState } from 'react'
import { Col, Row, Space, Typography } from 'antd'
import { MetricStat } from './components/MetricStat'
import { RateChart } from './components/RateChart'
import { useBriefingHistory } from './hooks/useBriefingHistory'
import { useLatestBriefing } from '../dashboard/hooks/useLatestBriefing'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'

// 2026-08-23 사용자 요청 — 대시보드에 몰려있던 금/은/환율/지수·채권 카드와 시계열 차트를
// "종목"처럼 별도 메뉴로 분리. 대시보드는 시황 요약만 남긴다.
export function IndicesPage() {
  const [period, setPeriod] = useState<7 | 30>(30)
  const latest = useLatestBriefing()
  const history = useBriefingHistory(period)

  const sortedHistory = [...(history.data ?? [])].sort((a, b) => b.briefingDate.localeCompare(a.briefingDate))
  const previous = sortedHistory.find((b) => b.briefingDate !== latest.data?.briefingDate) ?? null

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        지수
      </Typography.Title>

      <SlowLoadingHint loading={latest.loading || history.loading} isSlow={latest.isSlow || history.isSlow} />

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
