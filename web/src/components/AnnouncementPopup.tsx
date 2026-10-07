import { useEffect, useRef, useState } from 'react'
import { Button, Modal, Space, Typography, Alert } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { request } from '../lib/api'
import { getLoginSession } from '../lib/loginSession'
import { type Notice, kstTomorrow } from '../../../shared/community'

// Mounted once in AppShell: route changes and focus never request another popup.
export function AnnouncementPopup({ onComplete }: { onComplete: () => void }) {
  const [items, setItems] = useState<Notice[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const location = useLocation()
  const path = useRef(location.pathname)
  useEffect(() => { path.current = location.pathname }, [location.pathname])
  useEffect(() => {
    let active = true
    const initialPath = path.current
    const session = getLoginSession()
    let interacted = false
    const interaction = () => { interacted = true }
    window.addEventListener('pointerdown', interaction, { once: true })
    const hiddenKey = `firewatch-notice-hidden:${session ? 'account' : 'anonymous'}`
    // Account state comes from the server, avoiding another account's local preference.
    try { if (sessionStorage.getItem('firewatch-notice-entry') || (!session && Number(localStorage.getItem(hiddenKey)) > Date.now())) { onComplete(); window.removeEventListener('pointerdown', interaction); return } } catch { /* Storage is optional. */ }
    request<Notice[]>('/api/community/popup?platform=WEB', { signal: AbortSignal.timeout(5000) }).then(data => {
      if (!active) return
      try { sessionStorage.setItem('firewatch-notice-entry', 'seen') } catch { /* Storage is optional. */ }
      if (!interacted && path.current === initialPath && getLoginSession()?.token === session?.token && data.length) setItems(data)
      else onComplete()
    }).catch(() => { if (active) onComplete() })
    return () => { active = false; window.removeEventListener('pointerdown', interaction) }
  }, [onComplete])
  const close = () => { setItems([]); onComplete() }
  async function hideToday() {
    setBusy(true); setError('')
    try {
      if (getLoginSession()) await request('/api/community/hide-today', { method: 'POST' })
      else localStorage.setItem('firewatch-notice-hidden:anonymous', String(kstTomorrow()))
      close()
    } catch { setError('오늘 숨김을 저장하지 못했습니다. 닫기를 누르거나 다시 시도해주세요.') } finally { setBusy(false) }
  }
  return <Modal title="FireWatch 새 소식" open={items.length > 0} onCancel={close} footer={<Space wrap><Link to="/community" onClick={close}>공지사항 전체 보기</Link><Button loading={busy} onClick={hideToday}>오늘 하루 보지 않기</Button><Button type="primary" onClick={close}>닫기</Button></Space>}>
    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>{error && <Alert type="error" message={error} />}{items.map(n => <section key={n.id}><Typography.Title level={4}>{n.title}</Typography.Title><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{n.content}</p></section>)}</div>
  </Modal>
}
