import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, App, Button, Card, Form, Skeleton, Space, Tag, TimePicker, Typography } from 'antd'
import { CheckCircleFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import { KeywordInput } from './components/KeywordInput'
import { useSettings } from './hooks/useSettings'
import { useWebPushSubscription } from './hooks/useWebPushSubscription'
import { ApiRequestError, updateSettings, type Settings } from '../../lib/api'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'
import { OperatorPushSetup } from '../../components/OperatorPushSetup'
import { CollectionNotice } from '../../components/CollectionNotice'
import { useIsOperator } from '../../lib/operatorAccess'
import { useLatestBriefing } from '../dashboard/hooks/useLatestBriefing'
import { BRAND_GREEN, SECTION_CARD_PROPS } from '../../lib/theme'

// AntD 정적 message는 ConfigProvider 테마를 못 받는 v5 known limitation이 있어, App.useApp()으로
// 받은 인스턴스에만 브랜드 그린 성공 아이콘을 지정한다(에러는 AntD 기본 색 그대로 — 감사로그 고정 4색과
// 마찬가지로 의미색은 건드리지 않는다).
const successIcon = <CheckCircleFilled style={{ color: BRAND_GREEN }} />

// KeywordInput 기본값(components/KeywordInput.tsx)과 동일한 상한 — 추천 칩 클릭이 onChange를
// 직접 호출해 KeywordInput 내부 가드를 안 거치므로 여기서 별도로 체크해야 한다(2026-09-01).
const MAX_KEYWORDS = 20

// Design Ref: §5.4 Settings 체크리스트 — FR-05
export function SettingsPage() {
  const isOperator = useIsOperator()
  const { message } = App.useApp()
  const { data, loading, error, isSlow, reload, replaceData } = useSettings()
  const latestBriefing = useLatestBriefing()
  const [pushTime, setPushTime] = useState<string>('08:00')
  const [keywords, setKeywords] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const editing = useRef(false)
  const dirty = Boolean(data && (pushTime !== data.pushTime || JSON.stringify(keywords) !== JSON.stringify(data.interestKeywords)))

  // 서버(외부 시스템)에서 비동기로 도착한 값으로 편집 가능한 로컬 상태를 동기화 — 정당한 effect 용례.
  useEffect(() => {
    if (data && !editing.current) {
      setPushTime(data.pushTime)
      setKeywords(data.interestKeywords)
    }
  }, [data])

  const handleSave = async () => {
    if (!data || loading || error || saving || !dirty) return
    setSaving(true)
    try {
      // 관심 종목은 이 화면이 아니라 종목 화면에서 관리 — 여기서는 그대로 넘겨서 덮어쓰지 않는다.
      const saved = await updateSettings({ pushTime, interestKeywords: keywords })
      editing.current = false
      replaceData(saved)
      message.success({ content: '설정을 저장했습니다.', icon: successIcon })
    } catch (err) {
      if (err instanceof ApiRequestError) {
        message.error(err.apiError.message)
      } else {
        message.error('설정 저장에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          설정
        </Typography.Title>
        <SlowLoadingHint loading={loading} isSlow={isSlow} />
        <Card {...SECTION_CARD_PROPS} title="알림 설정">
          <Skeleton active />
        </Card>
      </Space>
    )
  }

  if (!data) return <Card title="설정을 확인하지 못했어요"><p>저장된 설정은 유지돼요. 다시 불러온 뒤 변경해주세요.</p><Button onClick={reload}>설정 다시 불러오기</Button></Card>

  return (
    <Space className="settings-page" direction="vertical" size={20} style={{ width: '100%', maxWidth: 860, marginInline: 'auto', display: 'flex' }}>
      <header className="compact-intro"><Typography.Title level={2}>알림과 관심 키워드</Typography.Title><p>브리핑을 받을 시간과 자주 살펴볼 주제를 정해주세요.</p></header>
      <Card {...SECTION_CARD_PROPS} title="브리핑 설정">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {error && <Alert type="error" message="설정을 다시 확인하지 못했어요" description="편집한 내용은 유지했어요. 다시 확인한 뒤 저장해주세요." showIcon action={<Button onClick={reload}>다시 확인</Button>} />}
          {loading && <p role="status">설정을 다시 확인하고 있어요. 입력한 내용은 유지돼요.</p>}

          <Form layout="vertical" disabled={saving}>
            <Form.Item label="브리핑 받을 시간" extra="한국 시간(KST) 기준이에요. 브리핑은 오전 7시 이후 준비하며, 발송을 15분마다 확인해 조금 늦게 도착할 수 있어요.">
              <TimePicker
                aria-label="브리핑 받을 시간"
                allowClear={false}
                value={dayjs(pushTime, 'HH:mm')}
                format="HH:mm"
                onChange={(value) => { editing.current = true; setPushTime(value ? value.format('HH:mm') : '08:00') }}
              />
            </Form.Item>
            <Form.Item label="관심 키워드">
              <KeywordInput value={keywords} disabled={saving} onChange={next => { editing.current = true; setKeywords(next) }} />
              <TrendingKeywordSuggestions
                trendingKeywords={latestBriefing.data?.trendingKeywords ?? []}
                current={keywords}
                onAdd={(keyword) => {
                  if (saving || keywords.length >= MAX_KEYWORDS) return
                  editing.current = true
                  setKeywords([...keywords, keyword])
                }}
                disabled={saving || keywords.length >= MAX_KEYWORDS}
              />
            </Form.Item>
            <Space wrap><Button type="primary" onClick={handleSave} loading={saving} disabled={loading || Boolean(error) || !dirty}>변경사항 저장</Button><Typography.Text role="status" type="secondary">{dirty ? '아직 저장하지 않은 변경이 있어요.' : '저장된 설정이에요.'}</Typography.Text></Space>
          </Form>

          <Typography.Text type="secondary" style={{ display: 'block' }}>
            관심 기업은 <Link to="/stocks">기업 탐색</Link>에서 관리할 수 있어요.
          </Typography.Text>
        </Space>
      </Card>

      {data && <WebPushCard settings={data} onSubscribed={reload} />}
      {isOperator && <OperatorPushSetup />}
      {isOperator && <details onToggle={event => setDiagnosticsOpen(event.currentTarget.open)}><summary>운영자 수집 상태 확인</summary>{diagnosticsOpen && <CollectionNotice />}</details>}
      <Space wrap><Link to="/account">내 계정과 연결 기기</Link><Link to="/community">공지·문의</Link><Link to="/guide">도움말</Link></Space>
    </Space>
  )
}

// 오늘자 브리핑에서 Gemini가 뽑은 트렌드 키워드를 클릭 한 번으로 관심 키워드에 추가할 수 있게
// 보여준다(2026-09-01, BE-11/WEB-7). 이미 등록된 키워드는 후보에서 뺀다.
function TrendingKeywordSuggestions({
  trendingKeywords,
  current,
  onAdd,
  disabled,
}: {
  trendingKeywords: string[]
  current: string[]
  onAdd: (keyword: string) => void
  disabled: boolean
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
          <Button key={keyword} disabled={disabled} onClick={() => onAdd(keyword)} aria-label={`${keyword} 키워드 추가`}>
            + {keyword}
          </Button>
        ))}
      </Space>
    </Space>
  )
}

// 앱 설치 없이 이 브라우저로 알림을 받는 기능 — 2026-08-24, 모바일 사이드로드가 Play Protect에
// 막혀서 대안으로 추가. 여기서만 구독 버튼을 누르므로 "저장 안 된 편집 초안"이 아니라 서버에 이미
// 저장된 값(settings)을 그대로 같이 보낸다.
function WebPushCard({ settings, onSubscribed }: { settings: Settings; onSubscribed: () => void }) {
  const { message } = App.useApp()
  const { status, subscribe } = useWebPushSubscription()
  const [subscribing, setSubscribing] = useState(false)

  const handleSubscribe = async () => {
    setSubscribing(true)
    try {
      const webPushSubscription = await subscribe()
      await updateSettings({
        webPushSubscription,
      })
      message.success({ content: '브라우저 알림을 켰습니다.', icon: successIcon })
      onSubscribed()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '브라우저 알림 등록에 실패했습니다.')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <Card {...SECTION_CARD_PROPS} title="브라우저 알림">
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
