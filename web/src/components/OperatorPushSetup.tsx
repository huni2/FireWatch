import { useState } from 'react'
import { App, Button, Input, Space, Typography } from 'antd'
import { request } from '../lib/api'
import { getDeviceId } from '../lib/deviceId'

export function OperatorPushSetup() {
  const { message } = App.useApp()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const register = async () => {
    setBusy(true)
    try {
      await request('/api/collection/operator', { method: 'POST', headers: { 'X-API-Key': key, 'X-Device-Id': getDeviceId() } })
      message.success('운영자 장애 알림 수신자를 등록했습니다.')
    } catch (error) { message.error(error instanceof Error ? error.message : '등록에 실패했습니다.') }
    finally { setKey(''); setBusy(false) }
  }
  const recover = async () => {
    setBusy(true)
    try {
      await request('/api/settings/recover-legacy', { method: 'POST', headers: { 'X-API-Key': key, 'X-Device-Id': getDeviceId() } })
      window.location.reload()
    } catch (error) { message.error(error instanceof Error ? error.message : '이전에 실패했습니다.') }
    finally { setKey(''); setBusy(false) }
  }
  return <details><summary>운영자 장애 알림 설정</summary><Space direction="vertical" style={{ marginTop: 12 }}>
    <Typography.Text type="secondary">먼저 브라우저 알림을 켜주세요. 관리 키로 등록하면 이 계정의 기기로 수집 실패 알림을 받습니다. 기존 운영자 수신자를 교체합니다.</Typography.Text>
    <Input.Password aria-label="운영자 관리 키" autoComplete="off" placeholder="운영자 관리 키" value={key} onChange={event => setKey(event.target.value)} />
    <Button disabled={!key} loading={busy} onClick={() => void register()}>운영자 푸시 등록</Button>
    <Typography.Text type="secondary">예전 공용 기기로 저장했던 운영자 설정과 게임은 관리 키로 한 번 이전할 수 있습니다. 현재 기기에 설정·포트폴리오·게임이 있으면 덮어쓰지 않고 중단합니다. 이전 후 브라우저 알림을 등록해주세요.</Typography.Text>
    <Button disabled={!key || busy} onClick={() => void recover()}>기존 운영자 데이터 가져오기</Button>
  </Space></details>
}
