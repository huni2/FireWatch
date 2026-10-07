import { useEffect, useState } from 'react'
import { Alert } from 'antd'
import { Link } from 'react-router-dom'
import { request } from '../lib/api'
import { collectionNames, type CollectionAlert } from '../../../shared/collection'
import { getOperatorKey } from '../lib/operatorAccess'

export function CollectionNotice() {
  const [alerts, setAlerts] = useState<CollectionAlert[]>([])
  useEffect(() => {
    let active = true
    const load = () => { if (document.visibilityState === 'visible') void request<CollectionAlert[]>('/api/collection/alerts', { headers: { 'X-API-Key': getOperatorKey() } })
      .then(data => { if (active && Array.isArray(data)) setAlerts(data) }).catch(() => {}) }
    load()
    document.addEventListener('visibilitychange', load)
    return () => { active = false; document.removeEventListener('visibilitychange', load) }
  }, [])
  if (!alerts.length) return null
  return <Alert showIcon type="warning" style={{ marginBottom: 16 }} message="데이터 수집 장애" description={<>
    {alerts.map(alert => <div key={alert.id}>{collectionNames[alert.category]} · {alert.message} ({new Date(alert.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST)</div>)}
    마지막 정상 데이터는 유지됩니다. <Link to="/audit-log">감사로그 확인</Link>
  </>} />
}
