import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Modal, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { linkGoogleAccount, logoutAccount, fetchLinkedDevices, revokeLinkedDevice, type LinkedDevice } from '../../lib/accountApi'
import { getLoginSession, useLoginSession } from '../../lib/loginSession'
import { loadGoogleSignIn } from '../../lib/googleSignIn'
import { useSettings } from '../settings/hooks/useSettings'
import { useIsOperator } from '../../lib/operatorAccess'

const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
export function AccountPage() {
  const session = useLoginSession()
  const settings = useSettings()
  const operator = useIsOperator()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [devices, setDevices] = useState<LinkedDevice[] | null>(null)
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const loggedIn = Boolean(session && getLoginSession() && settings.data?.linkedEmail && !settings.error)
  const deviceAction = async (id?: string) => {
    setDeviceBusy(true); setError('')
    try {
      if (id) await revokeLinkedDevice(id)
      setDevices(await fetchLinkedDevices())
    } catch (e) { setError(e instanceof Error ? e.message : '연결 기기를 확인하지 못했습니다.') }
    finally { setDeviceBusy(false) }
  }
  const logout = async () => {
    setBusy(true); setError('')
    try { await logoutAccount(); window.google?.accounts.id.disableAutoSelect(); window.location.replace('/account') }
    catch (e) { setError(e instanceof Error ? e.message : '로그아웃에 실패했습니다.'); setBusy(false) }
  }
  return <Space className="account-page" direction="vertical" size={24} style={{ width: '100%', maxWidth: 860, marginInline: 'auto', display: 'flex' }}>
    <header className="compact-intro"><Typography.Title level={2}>내 계정과 연결 기기</Typography.Title><p>다른 기기에서도 같은 계정의 투자 기록과 관심 설정을 확인하세요.</p></header>
    <Card className="account-connection" title={loggedIn ? 'Google 계정에 연결됨' : 'Google 계정으로 연결하기'}>
      {settings.loading && <p role="status">현재 계정 상태를 확인하고 있습니다.</p>}
      {loggedIn ? <><Typography.Paragraph strong>{settings.data?.linkedEmail}</Typography.Paragraph><Tag color={operator ? 'orange' : 'default'}>{operator ? '서버에서 확인한 운영자' : '로그인됨'}</Tag><p>포트폴리오와 관심·알림 설정은 계정에 연결됩니다. 가상게임은 현재 기기의 독립 기록입니다.</p><Space wrap><Button loading={deviceBusy} onClick={() => void deviceAction()}>연결 기기 확인</Button><Button disabled={busy} onClick={() => setLogoutOpen(true)}>로그아웃</Button>{operator && <Link to="/audit-log">운영 감사로그 →</Link>}</Space></> : <><p>내 투자 기록과 관심 설정을 다른 기기에서도 이어서 확인하세요.</p>{settings.error && <Alert style={{ marginBottom: 16 }} type="warning" message="계정 확인이 필요합니다" description={settings.error.message} />}{clientId ? session && settings.loading ? <p>기존 로그인 상태를 확인하고 있습니다.</p> : <GoogleLoginButton onBusy={setBusy} onError={setError} /> : <Alert type="info" message="Google 로그인 활성화를 준비 중입니다" description="웹용 Google 로그인 설정이 완료되면 이곳에서 계정을 연결할 수 있어요. 익명 이용과 기존 기록은 계속 유지됩니다." />}<p className="account-assurance">로그아웃해도 계정 기록은 보관됩니다.</p><details className="account-link-details"><summary>처음 연결할 때 내 기록은 어떻게 되나요?</summary><p>처음 연결하면 현재 브라우저의 투자 기록과 설정을 계정에 연결합니다. 이미 계정에 기록이 있다면 계정 자료를 표시하며, 포트폴리오가 충돌하면 덮어쓰지 않고 연결을 중단합니다.</p><p>같은 Google 계정으로 다시 로그인하면 계정 기록을 확인할 수 있어요.</p></details></>}
      {busy && <p role="status">계정 연결을 처리하고 있습니다. 완료되면 새 계정의 기록을 불러옵니다.</p>}
      {error && <Alert style={{ marginTop: 16 }} type="error" showIcon message={error} />}
    </Card>
    {devices && <Card title={`연결 기기 · ${devices.length}개`}><Space direction="vertical" style={{ width: '100%' }}>{devices.map((device, index) => <div key={device.id} className="data-status-line"><div><strong>{device.current ? '현재 기기' : `연결 기기 ${index + 1}`}</strong><span>연결 {new Date(device.linkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</span></div>{!device.current && <Button disabled={deviceBusy} onClick={() => Modal.confirm({ title: '이 기기의 연결을 해제할까요?', content: '계정 기록은 보관됩니다. 해당 기기는 다시 로그인해야 계정 기록을 볼 수 있습니다.', okText: '연결 해제', cancelText: '취소', onOk: () => deviceAction(device.id) })}>연결 해제</Button>}</div>)}</Space></Card>}
    <Card title="어떤 기록이 연결되나요?"><ul><li>계정으로 함께 보는 기록: 포트폴리오·투자 조건·관심 회사·관심 키워드·알림 설정</li><li>현재 기기에 남는 기록: 가상투자 게임</li><li>사이트 저장소를 지우면 익명 기기 기록을 다시 찾기 어려울 수 있어요.</li></ul><Space wrap><Link to="/">내 투자 기록 →</Link><Link to="/guide?topic=saved-data">기록 보관 도움말 →</Link></Space></Card>
    <Modal title="로그아웃할까요?" open={logoutOpen} onCancel={() => { if (!busy) setLogoutOpen(false) }} onOk={() => void logout()} confirmLoading={busy} cancelButtonProps={{ disabled: busy }} okText="로그아웃" cancelText="취소"><p>계정 기록을 삭제하지 않습니다. 로그아웃 후에는 현재 브라우저의 익명 기록을 표시하며, 계정 기록은 다시 로그인해서 확인할 수 있어요.</p></Modal>
  </Space>
}

function GoogleLoginButton({ onBusy, onError }: { onBusy: (busy: boolean) => void; onError: (message: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const operation = useRef(false)
  const [retry, setRetry] = useState(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    loadGoogleSignIn().then(id => {
      if (!active || !container.current) return
      id.initialize({ client_id: clientId, auto_select: false, ux_mode: 'popup', callback: async response => {
        if (!active || operation.current) return
        operation.current = true; onBusy(true); onError('')
        try { await linkGoogleAccount(response.credential); window.location.replace('/account') }
        catch (e) { if (active) { onError(e instanceof Error ? e.message : '로그인에 실패했습니다.'); onBusy(false) } }
        finally { operation.current = false }
      } })
      id.renderButton(container.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: Math.min(320, container.current.clientWidth || 320), locale: 'ko' })
    }).catch(e => { if (active) { onError(e.message); setFailed(true) } })
    return () => { active = false }
  }, [retry, onBusy, onError])
  return <div>{failed && <Button onClick={() => { setFailed(false); onError(''); setRetry(v => v + 1) }}>로그인 화면 다시 불러오기</Button>}<div ref={container} style={{ minHeight: 44, maxWidth: '100%' }} aria-label="Google 로그인" /></div>
}
