import { useEffect, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Skeleton,
  Space,
  Statistic,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import type { Briefing, GameDifficulty, GameInstrumentType, GameTradeAction, GameTurn } from '../../lib/api'
import { ApiRequestError, endGame, fetchCurrentTurn, nextGameTurn, startGame, tradeGame } from '../../lib/api'
import { MetricStat } from '../indices/components/MetricStat'
import { RelatedNewsCard } from '../news/components/RelatedNewsCard'
import { StockSearchInput } from '../stocks/components/StockSearchInput'
import { SECTION_CARD_PROPS, TREND_DOWN_COLOR, TREND_UP_COLOR } from '../../lib/theme'

const { Title, Text, Paragraph } = Typography

// 뉴스가 많은 날엔 "그날의 뉴스" 카드만 길어져 옆 칸(거래 패널)과 높이가 안 맞는다는 지적(2026-10-06)
// — 대시보드 핫이슈처럼 상위 몇 건만 보여준다.
const MAX_GAME_NEWS = 5

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

const DIFFICULTY_OPTIONS: { label: string; value: GameDifficulty }[] = [
  { label: '쉬움 · 2,000만원', value: 'EASY' },
  { label: '보통 · 1,000만원', value: 'NORMAL' },
  { label: '어려움 · 500만원', value: 'HARD' },
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
// 턴 순서로 쓰는 턴제 게임. 진입 시 먼저 GET /current로 이어할 게임이 있는지 확인하고, 없으면(404)
// 난이도·공매도 설정 화면을 보여준 뒤 그 값으로 POST /start를 호출한다 — 설정은 세션 시작 시점에만
// 고를 수 있고 중간엔 못 바꾼다(2026-10-05 사용자 요청).
export function GamePage() {
  const { message } = App.useApp()
  const [turn, setTurn] = useState<GameTurn | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [difficulty, setDifficulty] = useState<GameDifficulty>('NORMAL')
  const [allowShortSelling, setAllowShortSelling] = useState(false)
  const [starting, setStarting] = useState(false)
  const [tradeInstrument, setTradeInstrument] = useState<GameInstrumentType>('GOLD')
  const [tradeSymbol, setTradeSymbol] = useState<string | null>(null)
  const [tradeAction, setTradeAction] = useState<GameTradeAction>('BUY')
  const [tradeQuantity, setTradeQuantity] = useState<number | null>(1)
  const [trading, setTrading] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [ending, setEnding] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCurrentTurn()
      .then((result) => {
        if (!cancelled) setTurn(result)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiRequestError && err.status === 404) {
          setNeedsSetup(true)
        } else {
          setError(err instanceof Error ? err : new Error('게임을 불러오지 못했습니다'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleStartGame = async () => {
    setStarting(true)
    try {
      const result = await startGame({ difficulty, allowShortSelling })
      setTurn(result)
      setNeedsSetup(false)
    } catch (err) {
      message.error(err instanceof ApiRequestError ? err.apiError.message : '게임을 시작하지 못했습니다.')
    } finally {
      setStarting(false)
    }
  }

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

  const handleEndGame = async () => {
    setEnding(true)
    try {
      const result = await endGame()
      setTurn(result)
    } catch (err) {
      message.error(err instanceof ApiRequestError ? err.apiError.message : '게임을 종료하지 못했습니다.')
    } finally {
      setEnding(false)
    }
  }

  const handlePickFromAi = (symbol: string) => {
    setTradeInstrument('STOCK')
    setTradeSymbol(symbol)
  }

  // 게임 제목 옆 "게임 방법" 버튼 — 4갈래 return(로딩/에러/설정/본문) 전부에서 재사용.
  const pageHeader = (
    <Space align="center" size={4}>
      <Title level={4} style={{ margin: 0 }}>
        가상투자 게임
      </Title>
      <Tooltip title="게임 방법 보기">
        <Button type="text" size="small" icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)} />
      </Tooltip>
    </Space>
  )

  // 2026-10-06 사용자 지적 — "패턴따라 되는지도 모르겠고", "포트폴리오 가치랑 보유현금 이것도 잘모르겠음",
  // "게임방법도 알려주는게 있어야 할듯" 세 가지를 한 번에 해소하는 설명 모달.
  const helpModal = (
    <Modal title="게임 방법" open={helpOpen} onCancel={() => setHelpOpen(false)} footer={null}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Text strong>어떻게 진행되나요?</Text>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            가상의 시작 자금으로 금·은·환율·지수·개별 종목을 매매해 수익률을 올리는 게임이에요. 매매를
            마쳤으면 "다음 턴으로"를 눌러 하루를 넘기세요.
          </Paragraph>
        </div>
        <div>
          <Text strong>가격은 진짜인가요, 가짜인가요?</Text>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            매 턴은 FireWatch가 실제로 쌓아온 날짜(그날의 실제 뉴스·시세·AI 추천종목) 중 하나예요 —
            가짜로 만든 패턴이 아니라 실제로 있었던 하루입니다. 다만 턴 순서는 달력 순서가 아니라
            무작위로 섞여 있어서, 다음에 어떤 날이 나올지는 미리 알 수 없어요.
          </Paragraph>
        </div>
        <div>
          <Text strong>포트폴리오 가치 vs 보유 현금</Text>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            <Text strong>보유 현금</Text>은 지금 바로 매매에 쓸 수 있는 돈이고, <Text strong>포트폴리오 가치</Text>는
            거기에 지금 보유 중인 자산의 평가금액까지 더한 총자산이에요(현금 + 보유자산 평가액).
            수익률은 시작 자금 대비 포트폴리오 가치의 변화율입니다.
          </Paragraph>
        </div>
        <div>
          <Text strong>난이도·공매도</Text>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            난이도는 시작 자금을 정해요(쉬움 2,000만원 · 보통 1,000만원 · 어려움 500만원). 공매도를
            켜두면 갖고 있지 않은 자산도 먼저 팔아 하락에 베팅할 수 있어요(보유 수량이 음수가 돼요).
          </Paragraph>
        </div>
        <div>
          <Text strong>게임을 중간에 끝내고 싶다면</Text>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            꼭 끝까지(최대 43턴) 안 하셔도 돼요 — 턴 헤더의 "그만하기" 버튼을 누르면 그 턴까지의
            기록으로 바로 결과를 볼 수 있어요.
          </Paragraph>
        </div>
      </Space>
    </Modal>
  )

  if (loading) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {pageHeader}
        <Skeleton active paragraph={{ rows: 6 }} />
      </Space>
    )
  }

  if (error) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {pageHeader}
        <Alert type="error" message="게임을 불러오지 못했습니다" description={error.message} showIcon />
      </Space>
    )
  }

  if (needsSetup) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {pageHeader}
        {helpModal}
        <Card {...SECTION_CARD_PROPS} title="게임 설정">
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                난이도 (시작 자금 — 게임 시작 후엔 바꿀 수 없어요)
              </Text>
              <Segmented value={difficulty} onChange={(v) => setDifficulty(v as GameDifficulty)} options={DIFFICULTY_OPTIONS} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Switch checked={allowShortSelling} onChange={setAllowShortSelling} />
              <Text>공매도 허용 — 보유하지 않은 자산도 매도해 하락에 베팅할 수 있어요</Text>
            </div>
            <Button type="primary" size="large" onClick={handleStartGame} loading={starting} block>
              게임 시작
            </Button>
          </Space>
        </Card>
      </Space>
    )
  }

  if (!turn) return null

  const returnColor = turn.returnPercent > 0 ? TREND_UP_COLOR : turn.returnPercent < 0 ? TREND_DOWN_COLOR : undefined

  const deckExhausted = turn.turnIndex + 1 >= turn.totalTurns

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {pageHeader}
      {helpModal}

      {/* 턴 헤더 — 신문 1면형 마스트헤드 톤(WEB-14)과 동일하게 박스 없이 */}
      <Card
        {...SECTION_CARD_PROPS}
        styles={{ title: { fontSize: 22, fontWeight: 800 } }}
        title={`턴 ${turn.turnIndex + 1}/${turn.totalTurns} · ${turn.turnDate}`}
        extra={
          <Space size={6}>
            {turn.allowShortSelling && <Tag>공매도 허용</Tag>}
            {turn.status === 'ENDED' && <Tag color="processing">게임 종료</Tag>}
            {turn.status !== 'ENDED' && (
              <Popconfirm
                title="게임을 그만두시겠어요?"
                description="지금까지의 기록으로 바로 결과를 볼 수 있어요."
                onConfirm={handleEndGame}
                okText="그만하기"
                cancelText="취소"
              >
                <Button size="small" danger loading={ending}>
                  그만하기
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        <Space size={32} wrap>
          <Statistic
            title={
              <Space size={4}>
                포트폴리오 가치
                <Tooltip title="보유 현금 + 보유 자산 평가액을 합한 총자산이에요.">
                  <QuestionCircleOutlined style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)' }} />
                </Tooltip>
              </Space>
            }
            value={turn.portfolioValue}
            precision={0}
            suffix="원"
          />
          <Statistic
            title="수익률"
            value={turn.returnPercent}
            precision={2}
            suffix="%"
            valueStyle={{ color: returnColor }}
          />
          <Statistic
            title={
              <Space size={4}>
                보유 현금
                <Tooltip title="지금 바로 매매에 쓸 수 있는 돈이에요(포트폴리오 가치에는 보유 자산 평가액도 포함돼요).">
                  <QuestionCircleOutlined style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)' }} />
                </Tooltip>
              </Space>
            }
            value={turn.cash}
            precision={0}
            suffix="원"
          />
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
            <Text type="secondary">
              {deckExhausted
                ? '쌓인 브리핑을 전부 소진했습니다 — 수고하셨습니다!'
                : '게임을 중간에 종료했습니다 — 수고하셨습니다!'}
            </Text>
            <Button onClick={() => setNeedsSetup(true)}>새 게임 시작</Button>
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
            <RelatedNewsCard
              news={turn.briefing.news.slice(0, MAX_GAME_NEWS)}
              loading={false}
              title="그날의 뉴스"
              boxed={false}
            />

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
                          {holding.quantity}개{holding.quantity < 0 && ' · 공매도'}
                        </Text>
                      </Space>
                      <Text style={{ color: holding.value < 0 ? TREND_DOWN_COLOR : undefined }}>
                        {holding.value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원
                      </Text>
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
