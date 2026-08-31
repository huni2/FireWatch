import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, message, Skeleton, Space, Tag, TimePicker, Typography } from 'antd'
import dayjs from 'dayjs'
import { KeywordInput } from './components/KeywordInput'
import { useSettings } from './hooks/useSettings'
import { useWebPushSubscription } from './hooks/useWebPushSubscription'
import { ApiRequestError, updateSettings, type Settings } from '../../lib/api'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'
import { useLatestBriefing } from '../dashboard/hooks/useLatestBriefing'

// KeywordInput 기본값(components/KeywordInput.tsx)과 동일한 상한 — 추천 칩 클릭이 onChange를
// 직접 호출해 KeywordInput 내부 가드를 안 거치므로 여기서 별도로 체크해야 한다(2026-09-01).
const MAX_KEYWORDS = 20

// Design Ref: §5.4 Settings 체크리스트 — FR-05
export function SettingsPage() {
  const { data, loading, error, isSlow, reload } = useSettings()
  const latestBriefing = useLatestBriefing()
  const [pushTime, setPushTime] = useState<string>('08:00')
  const [keywords, setKeywords] = useState<string[]>([])
  const [watchedStocks, setWatchedStocks] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // 서버(외부 시스템)에서 비동기로 도착한 값으로 편집 가능한 로컬 상태를 동기화 — 정당한 effect 용례.
  useEffect(() => {
    if (data) {
      setPushTime(data.pushTime)
      setKeywords(data.interestKeywords)
      setWatchedStocks(data.watchedStocks)
    }
  }, [data])

  const handleSave = async () => {
    setSaving(true)
    try {
      // 관심 종목은 이 화면이 아니라 종목 화면에서 관리 — 여기서는 그대로 넘겨서 덮어쓰지 않는다.
      await updateSettings({ pushTime, interestKeywords: keywords, watchedStocks })
      message.success('설정을 저장했습니다.')
      reload()
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        message.error('API 키가 올바르지 않습니다. VITE_SETTINGS_API_KEY 설정을 확인하세요.')
      } else if (err instanceof ApiRequestError) {
        message.error(err.apiError.message)
      } else {
        message.error('설정 저장에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          설정
        </Typography.Title>
        <SlowLoadingHint loading={loading} isSlow={isSlow} />
        <Card className="hoverable-card">
          <Skeleton active />
        </Card>
      </Space>
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        설정
      </Typography.Title>
      <Card className="hoverable-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {error && <Alert type="error" message="설정을 불러오지 못했습니다" description={error.message} showIcon />}

          <Form layout="vertical">
            <Form.Item label="푸시 수신 시간">
              <TimePicker
                value={dayjs(pushTime, 'HH:mm')}
                format="HH:mm"
                onChange={(value) => setPushTime(value ? value.format('HH:mm') : '08:00')}
              />
            </Form.Item>
            <Form.Item label="관심 키워드">
              <KeywordInput value={keywords} onChange={setKeywords} />
              <TrendingKeywordSuggestions
                trendingKeywords={latestBriefing.data?.trendingKeywords ?? []}
                current={keywords}
                onAdd={(keyword) => {
                  if (keywords.length >= MAX_KEYWORDS) return
                  setKeywords([...keywords, keyword])
                }}
              />
            </Form.Item>
            <Button type="primary" onClick={handleSave} loading={saving}>
              저장
            </Button>
          </Form>

          <Typography.Text type="secondary" style={{ display: 'block' }}>
            관심 종목(주식)은 종목 화면에서 관리합니다.
          </Typography.Text>
        </Space>
      </Card>

      {data && <WebPushCard settings={data} onSubscribed={reload} />}
    </Space>
  )
}

// 오늘자 브리핑에서 Gemini가 뽑은 트렌드 키워드를 클릭 한 번으로 관심 키워드에 추가할 수 있게
// 보여준다(2026-09-01, BE-11/WEB-7). 이미 등록된 키워드는 후보에서 뺀다.
function TrendingKeywordSuggestions({
  trendingKeywords,
  current,
  onAdd,
}: {
  trendingKeywords: string[]
  current: string[]
  onAdd: (keyword: string) => void
}) {
  const suggestions = trendingKeywords.filter((keyword) => !current.includes(keyword))
  if (suggestions.length === 0) return null

  return (
    <Space direction="vertical" size={4} style={{ marginTop: 8 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        오늘의 추천 키워드 (클릭하면 추가)
      </Typography.Text>
      <Space wrap>
        {suggestions.map((keyword) => (
          <Tag key={keyword} style={{ cursor: 'pointer' }} onClick={() => onAdd(keyword)}>
            + {keyword}
          </Tag>
        ))}
      </Space>
    </Space>
  )
}

// 앱 설치 없이 이 브라우저로 알림을 받는 기능 — 2026-08-24, 모바일 사이드로드가 Play Protect에
// 막혀서 대안으로 추가. 여기서만 구독 버튼을 누르므로 "저장 안 된 편집 초안"이 아니라 서버에 이미
// 저장된 값(settings)을 그대로 같이 보낸다.
function WebPushCard({ settings, onSubscribed }: { settings: Settings; onSubscribed: () => void }) {
  const { status, subscribe } = useWebPushSubscription()
  const [subscribing, setSubscribing] = useState(false)

  const handleSubscribe = async () => {
    setSubscribing(true)
    try {
      const webPushSubscription = await subscribe()
      await updateSettings({
        pushTime: settings.pushTime,
        interestKeywords: settings.interestKeywords,
        watchedStocks: settings.watchedStocks,
        webPushSubscription,
      })
      message.success('브라우저 알림을 켰습니다.')
      onSubscribed()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '브라우저 알림 등록에 실패했습니다.')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <Card className="hoverable-card" title="브라우저 알림">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          앱 설치 없이 이 브라우저로 오늘의 브리핑 알림을 받습니다.
        </Typography.Text>

        {status === 'unsupported' && <Alert type="warning" showIcon message="이 브라우저는 웹 푸시를 지원하지 않습니다." />}
        {status === 'denied' && (
          <Alert
            type="warning"
            showIcon
            message="알림 권한이 차단돼 있습니다. 브라우저 주소창의 사이트 설정에서 알림을 허용해주세요."
          />
        )}

        {settings.webPushSubscribed && <Tag color="success">이 서버에 구독된 브라우저가 있습니다</Tag>}

        <Button onClick={handleSubscribe} loading={subscribing} disabled={status === 'unsupported'}>
          {settings.webPushSubscribed ? '이 브라우저도 구독하기' : '브라우저 알림 켜기'}
        </Button>
      </Space>
    </Card>
  )
}
