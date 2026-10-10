import { useEffect, useState } from 'react'
import { Alert, Button, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { request } from '../lib/api'
import { collectionNames, type CollectionAlert } from '../../../shared/collection'
import { getOperatorKey } from '../lib/operatorAccess'

export function CollectionNotice() {
  const [alerts, setAlerts] = useState<CollectionAlert[]>([])
  const [revision, setRevision] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  useEffect(() => {
    let active = true
    const load = () => { if (document.visibilityState === 'visible') void request<CollectionAlert[]>('/api/collection/alerts', { headers: { 'X-API-Key': getOperatorKey() } })
      .then(data => { if (active && Array.isArray(data)) { setAlerts(data); setStatus('ready') } }).catch(() => { if (active) setStatus('error') }) }
    load()
    document.addEventListener('visibilitychange', load)
    return () => { active = false; document.removeEventListener('visibilitychange', load) }
  }, [revision])
  return <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}><Button onClick={() => { setStatus('loading'); setRevision(value => value + 1) }} loading={status === 'loading'}>상태 다시 확인</Button>
  {status === 'error' ? <Alert type="error" message="운영 상태를 확인하지 못했습니다." /> : status === 'loading' ? <Typography.Text type="secondary">운영 상태 확인 중…</Typography.Text> : !alerts.length ? <Typography.Text>미해결 운영 장애가 없습니다.</Typography.Text> : <Alert showIcon type="warning" message="미해결 운영 기록" description={<>
    {alerts.map(alert => <div key={alert.id}>{collectionNames[alert.category]} · {alert.message} ({new Date(alert.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST)</div>)}
    마지막 정상 데이터는 유지됩니다. <Link to="/audit-log">감사로그 확인</Link>
  </>} />}</Space>
}
