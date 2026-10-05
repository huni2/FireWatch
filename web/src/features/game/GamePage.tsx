import { useEffect, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  InputNumber,
  Segmented,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import type { Briefing, GameInstrumentType, GameTradeAction, GameTurn } from '../../lib/api'
import { ApiRequestError, nextGameTurn, startGame, tradeGame } from '../../lib/api'
import { MetricStat } from '../indices/components/MetricStat'
import { RelatedNewsCard } from '../news/components/RelatedNewsCard'
import { StockSearchInput } from '../stocks/components/StockSearchInput'
import { SECTION_CARD_PROPS, TREND_DOWN_COLOR, TREND_UP_COLOR } from '../../lib/theme'

const { Title, Text } = Typography

const MACRO_INSTRUMENTS: { type: GameInstrumentType; label: string; precision?: number }[] = [
  { type: 'GOLD', label: '금(USD/oz)' },
  { type: 'SILVER', label: '은(USD/oz)' },
  { type: 'USD', label: 'USD/KRW' },
  { type: 'KOSPI', label: '코스피' },
  { type: 'KOSDAQ', label: '코스닥' },
  { type: 'SP500', label: 'S&P500' },
  { type: 'NASDAQ', label: '나스닥' },
  { type: 'DOW', label: '다우존스' },
]

function macroPrice(briefing: Briefing, type: GameInstrumentType): number | null {
  switch (type) {
    case 'GOLD':
      return briefing.goldPrice
    case 'SILVER':
      return briefing.silverPrice
    case 'USD':
      return briefing.usdKrw
    case 'KOSPI':
      return briefing.kospi
    case 'KOSDAQ':
      return briefing.kosdaq
    case 'SP500':
      return briefing.sp500
    case 'NASDAQ':
      return briefing.nasdaq
    case 'DOW':
      return briefing.dow
    default:
      return null
  }
}

function instrumentLabel(type: GameInstrumentType, symbol: string | null): string {
  if (type === 'STOCK') return symbol ?? '종목'
  return MACRO_INSTRUMENTS.find((m) => m.type === type)?.label ?? type
}

// Design Ref: 가상투자 게임(2026-10-05, BE-16/WEB-16) — 실제로 쌓인 Briefing 날짜를 셔플한 덱을
// 턴 순서로 쓰는 턴제 게임. /api/game/start는 멱등이라(이미 활성 세션 있으면 그대로 반환) 진입 시
// 항상 호출해 "새로 시작" / "이어하기"를 구분하지 않는다.
export function GamePage() {
  const { message } = App.useApp()
  const [turn, setTurn] = useState<GameTurn | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tradeInstrument, setTradeInstrument] = useState<GameInstrumentType>('GOLD')
  const [tradeSymbol, setTradeSymbol] = useState<string | null>(null)
  const [tradeAction, setTradeAction] = useState<GameTradeAction>('BUY')
  const [tradeQuantity, setTradeQuantity] = useState<number | null>(1)
  const [trading, setTrading] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    let cancelled = false
    startGame()
      .then((result) => {
        if (!cancelled) setTurn(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error('게임을 불러오지 못했습니다'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleTrade = async () => {
    if (!tradeQuantity || tradeQuantity <= 0) {
      message.warning('수량을 입력해주세요.')
      return
    }
    if (tradeInstrument === 'STOCK' && !tradeSymbol) {
      message.warning('종목을 먼저 검색해서 선택해주세요.')
      return
    }
    setTrading(true)
    try {
      const result = await tradeGame({
        instrumentType: tradeInstrument,
        symbol: tradeInstrument === 'STOCK' ? (tradeSymbol ?? undefined) : undefined,
        action: tradeAction,
        quantity: tradeQuantity,
      })
      setTurn(result)
      message.success(`${tradeAction === 'BUY' ? '매수' : '매도'} 완료`)
    } catch (err) {
      message.error(err instanceof ApiRequestError ? err.apiError.message : '거래에 실패했습니다.')
    } finally {
      setTrading(false)
    }
  }

  const handleNextTurn = async () => {
    setAdvancing(true)
    try {
      const result = await nextGameTurn()
      setTurn(result)
    } catch (err) {
      message.error(err instanceof ApiRequestError ? err.apiError.message : '다음 턴으로 넘어가지 못했습니다.')
    } finally {
      setAdvancing(false)
    }
  }

  const handlePickFromAi = (symbol: string) => {
    setTradeInstrument('STOCK')
    setTradeSymbol(symbol)
  }

  if (loading) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>
          가상투자 게임
        </Title>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Space>
    )
  }

  if (error) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>
          가상투자 게임
        </Title>
        <Alert type="error" message="게임을 불러오지 못했습니다" description={error.message} showIcon />
      </Space>
    )
  }

  if (!turn) return null

  const returnColor = turn.returnPercent > 0 ? TREND_UP_COLOR : turn.returnPercent < 0 ? TREND_DOWN_COLOR : undefined

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={4} style={{ margin: 0 }}>
        가상투자 게임
      </Title>

      {/* 턴 헤더 — 신문 1면형 마스트헤드 톤(WEB-14)과 동일하게 박스 없이 */}
      <Card
        {...SECTION_CARD_PROPS}
        styles={{ title: { fontSize: 22, fontWeight: 800 } }}
        title={`턴 ${turn.turnIndex + 1}/${turn.totalTurns} · ${turn.turnDate}`}
        extra={turn.status === 'ENDED' ? <Tag color="processing">게임 종료</Tag> : null}
      >
        <Space size={32} wrap>
          <Statistic title="포트폴리오 가치" value={turn.portfolioValue} precision={0} suffix="원" />
          <Statistic
            title="수익률"
            value={turn.returnPercent}
            precision={2}
            suffix="%"
            valueStyle={{ color: returnColor }}
          />
          <Statistic title="보유 현금" value={turn.cash} precision={0} suffix="원" />
        </Space>
      </Card>

      {turn.status === 'ENDED' ? (
        <Card {...SECTION_CARD_PROPS} title="게임 결과">
          <Space direction="vertical">
            <Text>시작 자금 {turn.startingCash.toLocaleString('ko-KR')}원</Text>
            <Text>최종 자산 {turn.portfolioValue.toLocaleString('ko-KR')}원</Text>
            <Text strong style={{ color: returnColor, fontSize: 18 }}>
              {turn.returnPercent > 0 ? '+' : ''}
              {turn.returnPercent.toFixed(2)}%
            </Text>
            <Text type="secondary">쌓인 브리핑을 전부 소진했습니다 — 수고하셨습니다!</Text>
          </Space>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32,
            paddingTop: 8,
            borderTop: '1px solid var(--ant-color-border-secondary)',
          }}
        >
          <Space direction="vertical" size={32} style={{ width: '100%' }}>
            <Card {...SECTION_CARD_PROPS} title="그날의 지표">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {MACRO_INSTRUMENTS.map((m, i) => (
                  <div key={m.type} style={{ minWidth: 140, flex: '1 1 140px' }}>
                    <MetricStat title={m.label} value={macroPrice(turn.briefing, m.type)} index={i} />
                  </div>
                ))}
              </div>
            </Card>

            {turn.briefing.recommendedStocks.length > 0 && (
              <Card {...SECTION_CARD_PROPS} title="AI의 오늘의 픽">
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  클릭하면 아래 거래 패널에 바로 채워집니다.
                </Text>
                <Space wrap size={6}>
                  {turn.briefing.recommendedStocks.map((name) => (
                    <Tag
                      key={name}
                      color="blue"
                      style={{ cursor: 'pointer', borderRadius: 999, paddingInline: 10 }}
                      onClick={() => handlePickFromAi(name)}
                    >
                      {name}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}

            <Card {...SECTION_CARD_PROPS} title="거래">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Segmented
                  value={tradeInstrument}
                  onChange={(value) => {
                    setTradeInstrument(value as GameInstrumentType)
                    if (value !== 'STOCK') setTradeSymbol(null)
                  }}
                  options={[...MACRO_INSTRUMENTS.map((m) => ({ label: m.label, value: m.type })), { label: '개별 종목', value: 'STOCK' }]}
                />
                {tradeInstrument === 'STOCK' && (
                  <>
                    <StockSearchInput onSelect={setTradeSymbol} />
                    {tradeSymbol && <Tag color="blue">{tradeSymbol}</Tag>}
                  </>
                )}
                <Segmented
                  value={tradeAction}
                  onChange={(value) => setTradeAction(value as GameTradeAction)}
                  options={[
                    { label: '매수', value: 'BUY' },
                    { label: '매도', value: 'SELL' },
                  ]}
                />
                <InputNumber
                  min={0}
                  value={tradeQuantity}
                  onChange={setTradeQuantity}
                  placeholder="수량"
                  style={{ width: '100%' }}
                />
                <Button type="primary" onClick={handleTrade} loading={trading} block>
                  {tradeAction === 'BUY' ? '매수하기' : '매도하기'}
                </Button>
              </Space>
            </Card>
          </Space>

          <Space direction="vertical" size={32} style={{ width: '100%' }}>
            <RelatedNewsCard news={turn.briefing.news} loading={false} title="그날의 뉴스" boxed={false} />

            <Card {...SECTION_CARD_PROPS} title="보유 자산">
              {turn.holdings.length === 0 ? (
                <Empty description="아직 보유한 자산이 없습니다" />
              ) : (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  {turn.holdings.map((holding) => (
                    <div
                      key={`${holding.instrumentType}-${holding.symbol ?? ''}`}
                      style={{ display: 'flex', justifyContent: 'space-between' }}
                    >
                      <Space size={8}>
                        <Text strong>{instrumentLabel(holding.instrumentType, holding.symbol)}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {holding.quantity}개
                        </Text>
                      </Space>
                      <Text>{holding.value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원</Text>
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          </Space>
        </div>
      )}

      {turn.status !== 'ENDED' && (
        <Button type="primary" size="large" onClick={handleNextTurn} loading={advancing} block>
          다음 턴으로
        </Button>
      )}
    </Space>
  )
}
