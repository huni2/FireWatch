import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, message, Skeleton, Space, TimePicker, Typography } from 'antd'
import dayjs from 'dayjs'
import { KeywordInput } from './components/KeywordInput'
import { useSettings } from './hooks/useSettings'
import { ApiRequestError, updateSettings } from '../../lib/api'

// Design Ref: §5.4 Settings 체크리스트 — FR-05
export function SettingsPage() {
  const { data, loading, error, reload } = useSettings()
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
            </Form.Item>
            <Button type="primary" onClick={handleSave} loading={saving}>
              저장
            </Button>
          </Form>

          <Typography.Text type="secondary" style={{ display: 'block' }}>
            관심 종목(주식)은 종목 화면에서 관리합니다. 모바일 앱은 Phase 2에서 제공됩니다.
          </Typography.Text>
        </Space>
      </Card>
    </Space>
  )
}
