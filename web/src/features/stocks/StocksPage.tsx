import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, Empty, Segmented, Skeleton, Space, Typography } from 'antd'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { KeywordInput } from '../settings/components/KeywordInput'
import { StockChart } from './components/StockChart'
import { StockSearchInput } from './components/StockSearchInput'
import { useSettings } from '../settings/hooks/useSettings'
import { ApiRequestError, updateSettings } from '../../lib/api'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'
import { SECTION_CARD_PROPS } from '../../lib/theme'
import { stockLabel } from '../../../../shared/stock-labels'
import { useStockNames } from './hooks/useStockNames'
import { InvestmentContext } from './components/InvestmentContext'

// Navigation parameters use internal identifiers; the visible UI uses company names.
const TICKER_PATTERN = /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)?$/

// 2026-08-21 사용자 요청 "원하는 종목과 특정 주식에 대한 차트도 보고싶은데" — 관심 종목 등록 + 차트를 별도 화면으로.
// 대시보드의 관심 종목 미니 요약에서 ?symbol=로 넘어오면 그 종목을 바로 선택해 보여준다.
export function StocksPage() {
  const { message } = App.useApp()
  const { data, loading, error, isSlow, reload } = useSettings()
  const [searchParams] = useSearchParams()
  const [watchedStocks, setWatchedStocks] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const { names, rememberName } = useStockNames()
  const labelForValue = (symbol: string) => stockLabel(symbol, names)

  useEffect(() => {
    if (data) {
      setWatchedStocks(data.watchedStocks)
      const fromQuery = searchParams.get('symbol')
      setSelected((current) => {
        if (fromQuery && TICKER_PATTERN.test(fromQuery)) return fromQuery
        if (current) return current
        return data.watchedStocks[0] ?? null
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, searchParams])

  const handleChange = async (next: string[]) => {
    const previous = watchedStocks
    const previousSelected = selected
    setWatchedStocks(next)
    if (selected && !next.includes(selected)) {
      setSelected(next[0] ?? null)
    }
    if (!data) return
    try {
      await updateSettings({ watchedStocks: next })
      reload()
    } catch (err) {
      // 낙관적으로 먼저 반영한 태그를 저장 실패 시 되돌린다 — 전엔 실패해도 아무 알림 없이 조용히
      // 저장 안 된 상태로 남아있던 버그(2026-10-05 지적).
      setWatchedStocks(previous)
      setSelected(previousSelected)
      message.error(err instanceof ApiRequestError ? err.apiError.message : '관심 종목 저장에 실패했습니다.')
    }
  }

  const handleAddFromSearch = (symbol: string, name?: string) => {
    rememberName(symbol, name)
    if (watchedStocks.includes(symbol)) {
      setSelected(symbol)
      return
    }
    setSelected(symbol)
  }

  // 대시보드 추천종목 태그 클릭(2026-10-04, WEB-9) — 이미 티커를 알고 있는 상태로 넘어오므로
  // 검색 없이 바로 추가한다(handleAddFromSearch 재사용).
  useEffect(() => {
    const toAdd = searchParams.get('add')
    if (toAdd && data && !watchedStocks.includes(toAdd)) {
      handleAddFromSearch(toAdd)
      void handleChange([...watchedStocks, toAdd])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, searchParams])

  if (loading) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          종목
        </Typography.Title>
        <SlowLoadingHint loading={loading} isSlow={isSlow} />
        <Card {...SECTION_CARD_PROPS} title="회사 이름으로 찾기" extra={selected && !watchedStocks.includes(selected) ? <Button onClick={() => void handleChange([...watchedStocks, selected])}>관심 종목에 담기</Button> : undefined}>
          <Skeleton active />
        </Card>
      </Space>
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        회사 검색·시세
      </Typography.Title>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card {...SECTION_CARD_PROPS} title="회사 이름으로 찾기" extra={selected && !watchedStocks.includes(selected) ? <Button onClick={() => void handleChange([...watchedStocks, selected])}>관심 종목에 담기</Button> : undefined}>
          {error && <Alert type="error" message="관심 종목 정보를 불러오지 못했습니다" description={error.message} showIcon />}

              <StockSearchInput onSelect={handleAddFromSearch} initialQuery={searchParams.get('q') ?? ''} />
              <Typography.Text type="secondary" style={{ display: 'block', margin: '8px 0' }}>
                국내 대형주는 한글명(예: 삼성전자)으로 찾을 수 있고, 그 외는 영문 사명(예: Tesla)으로 검색하세요.
              </Typography.Text>
              <KeywordInput value={watchedStocks} onChange={handleChange} showInput={false} labelForValue={labelForValue} />
        </Card>
      </motion.div>

      {watchedStocks.length === 0 && !selected ? (
        <Empty description="회사를 검색해 선택하면 가격·차트·뉴스를 볼 수 있어요. 관심 등록은 선택입니다." />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Card {...SECTION_CARD_PROPS} title="차트">
            <Segmented
              value={selected ?? undefined}
              onChange={(value) => setSelected(value as string)}
              options={[...new Set([...watchedStocks, ...(selected ? [selected] : [])])].map(symbol => ({ value: symbol, label: labelForValue(symbol) }))}
              style={{ marginBottom: 16, maxWidth: '100%', overflowX: 'auto' }}
            />
            {selected && <StockChart key={selected} symbol={selected} name={labelForValue(selected)} onNameFound={rememberName} />}
          </Card>
        </motion.div>
      )}
      {selected && <InvestmentContext symbol={selected} name={labelForValue(selected)} />}
    </Space>
  )
}
