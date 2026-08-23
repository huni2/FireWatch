import { useState } from 'react'
import { Alert, Card, DatePicker, Select, Space, Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { AuditStatusTag } from './components/AuditStatusTag'
import { useAuditLogs } from './hooks/useAuditLogs'
import type { AuditLogEntry } from '../../lib/api'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'

const { RangePicker } = DatePicker

const EVENT_TYPE_OPTIONS = [
  { value: undefined, label: '전체' },
  { value: 'SCHEDULER', label: 'SCHEDULER' },
  { value: 'GEMINI_API', label: 'GEMINI_API' },
  { value: 'FINANCIAL_API', label: 'FINANCIAL_API' },
  { value: 'NEWS_API', label: 'NEWS_API' },
  { value: 'FCM_PUSH', label: 'FCM_PUSH' },
  { value: 'USER_SETTING', label: 'USER_SETTING' },
  { value: 'ERROR', label: 'ERROR' },
]

const STATUS_OPTIONS = [
  { value: undefined, label: '전체' },
  { value: 'SUCCESS', label: 'SUCCESS' },
  { value: 'WARNING', label: 'WARNING' },
  { value: 'FALLBACK', label: 'FALLBACK' },
  { value: 'FAILURE', label: 'FAILURE' },
]

// Design Ref: §5.4 감사로그(Audit Log) 체크리스트 — FR-07
export function AuditLogPage() {
  const [eventType, setEventType] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [page, setPage] = useState(0)
  const size = 20

  const { data, loading, error, isSlow } = useAuditLogs({
    eventType,
    status,
    from: dateRange?.[0]?.startOf('day').toISOString(),
    to: dateRange?.[1]?.endOf('day').toISOString(),
    page,
    size,
  })

  const columns: ColumnsType<AuditLogEntry> = [
    {
      title: '이벤트 유형',
      dataIndex: 'eventType',
      width: 140,
    },
    {
      title: '작업명',
      dataIndex: 'actionName',
    },
    {
      title: '상태',
      dataIndex: 'status',
      width: 120,
      render: (value: AuditLogEntry['status']) => <AuditStatusTag status={value} />,
    },
    {
      title: '소요시간(ms)',
      dataIndex: 'executionTimeMs',
      width: 120,
      render: (value: number | null) => value ?? '—',
    },
    {
      title: '응답 요약',
      dataIndex: 'responseSummary',
      ellipsis: true,
      render: (value: string | null) => (
        <Tooltip title={value}>
          <span>{value ?? '—'}</span>
        </Tooltip>
      ),
    },
    {
      title: '시각',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        감사로그
      </Typography.Title>
      <SlowLoadingHint loading={loading} isSlow={isSlow} />
      <Card className="hoverable-card">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space wrap>
            <Select
              placeholder="이벤트 유형"
              style={{ width: 160 }}
              value={eventType}
              options={EVENT_TYPE_OPTIONS}
              onChange={(value) => {
                setEventType(value)
                setPage(0)
              }}
            />
            <Select
              placeholder="상태"
              style={{ width: 140 }}
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value)
                setPage(0)
              }}
            />
            <RangePicker
              value={dateRange}
              onChange={(value) => {
                setDateRange(value as [Dayjs, Dayjs] | null)
                setPage(0)
              }}
            />
          </Space>

          {error && <Alert type="error" message="감사로그를 불러오지 못했습니다" description={error.message} showIcon />}

          <Table
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={data?.data ?? []}
            scroll={{ x: 'max-content' }}
            rowClassName={(record) => (record.status === 'FAILURE' ? 'audit-row-failure' : '')}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: data?.pagination.total ?? 0,
              onChange: (nextPage) => setPage(nextPage - 1),
              showTotal: (total) => `총 ${total}건`,
            }}
          />
        </Space>
      </Card>
    </Space>
  )
}
