import { useEffect, useState } from 'react'
import { Alert, Card, Empty, Segmented, Skeleton, Space, Typography } from 'antd'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { KeywordInput } from '../settings/components/KeywordInput'
import { StockChart } from './components/StockChart'
import { useSettings } from '../settings/hooks/useSettings'
import { updateSettings } from '../../lib/api'

// 2026-08-21 사용자 요청 "원하는 종목과 특정 주식에 대한 차트도 보고싶은데" — 관심 종목 등록 + 차트를 별도 화면으로.
// 대시보드의 관심 종목 미니 요약에서 ?symbol=로 넘어오면 그 종목을 바로 선택해 보여준다.
export function StocksPage() {
  const { data, loading, error, reload } = useSettings()
  const [searchParams] = useSearchParams()
  const [watchedStocks, setWatchedStocks] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      setWatchedStocks(data.watchedStocks)
      const fromQuery = searchParams.get('symbol')
      setSelected((current) => {
        if (current) return current
        if (fromQuery && data.watchedStocks.includes(fromQuery)) return fromQuery
        return data.watchedStocks[0] ?? null
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleChange = async (next: string[]) => {
    setWatchedStocks(next)
    if (selected && !next.includes(selected)) {
      setSelected(next[0] ?? null)
    }
    if (!data) return
    await updateSettings({ pushTime: data.pushTime, interestKeywords: data.interestKeywords, watchedStocks: next })
    reload()
  }

  if (loading) {
    return (
      <Card title="종목">
        <Skeleton active />
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card className="hoverable-card" title="관심 종목">
          {error && <Alert type="error" message="설정을 불러오지 못했습니다" description={error.message} showIcon />}
          <KeywordInput
            value={watchedStocks}
            onChange={handleChange}
            placeholder="종목 티커 입력 후 Enter"
          />
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            국내 종목은 코스피 <code>005930.KS</code>, 코스닥은 <code>.KQ</code>, 해외는 <code>AAPL</code>처럼 티커를
            그대로 입력하세요.
          </Typography.Text>
        </Card>
      </motion.div>

      {watchedStocks.length === 0 ? (
        <Empty description="관심 종목을 추가하면 차트가 표시됩니다" />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Card className="hoverable-card" title="차트">
            <Segmented
              value={selected ?? undefined}
              onChange={(value) => setSelected(value as string)}
              options={watchedStocks}
              style={{ marginBottom: 16 }}
            />
            {selected && <StockChart symbol={selected} />}
          </Card>
        </motion.div>
      )}
    </Space>
  )
}
