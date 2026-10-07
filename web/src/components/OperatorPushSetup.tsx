import { useState } from 'react'
import { App, Button, Space, Typography } from 'antd'
import { request } from '../lib/api'
import { getDeviceId } from '../lib/deviceId'
import { getOperatorKey } from '../lib/operatorAccess'

export function OperatorPushSetup() {
  const { message, modal } = App.useApp()
  const [busy, setBusy] = useState(false)
  const register = async () => {
    setBusy(true)
    try {
      await request('/api/collection/operator', { method: 'POST', headers: { 'X-API-Key': getOperatorKey(), 'X-Device-Id': getDeviceId() } })
      message.success('운영자 장애 알림 수신자를 등록했습니다.')
    } catch (error) { message.error(error instanceof Error ? error.message : '등록에 실패했습니다.') }
    finally { setBusy(false) }
  }
  const recover = async () => {
    setBusy(true)
    try {
      await request('/api/settings/recover-legacy', { method: 'POST', headers: { 'X-API-Key': getOperatorKey(), 'X-Device-Id': getDeviceId() } })
      window.location.reload()
    } catch (error) { message.error(error instanceof Error ? error.message : '이전에 실패했습니다.') }
    finally { setBusy(false) }
  }
  const test = async () => {
    setBusy(true)
    try {
      await request('/api/collection/operator/test', { method: 'POST', headers: { 'X-API-Key': getOperatorKey(), 'X-Device-Id': getDeviceId() } })
      message.success('알림 제공처가 테스트 발송을 수락했습니다. 기기에서 실제 수신을 확인해주세요.')
    } catch (error) { message.error(error instanceof Error ? error.message : '테스트 발송에 실패했습니다.') }
    finally { setBusy(false) }
  }
  return <details><summary>운영자 장애 알림 설정</summary><Space direction="vertical" style={{ marginTop: 12 }}>
    <Typography.Text type="secondary">먼저 브라우저 알림을 켜주세요. 인증된 운영자 계정으로 등록하면 이 계정에 등록된 기기로 수집 실패 알림을 받습니다. 기존 운영자 수신자를 교체합니다.</Typography.Text>
    <Button loading={busy} onClick={() => modal.confirm({ title: '운영자 수신자 등록', content: '현재 계정으로 기존 운영자 알림 수신자를 교체합니다.', okText: '등록', cancelText: '취소', onOk: register })}>운영자 푸시 등록</Button>
    <Button disabled={busy} onClick={() => void test()}>수신 확인용 알림 보내기</Button>
    <Typography.Text type="secondary">테스트는 1분에 한 번 직접 발송할 수 있습니다. 발송 수락과 기기의 실제 수신은 다를 수 있습니다.</Typography.Text>
    <details><summary>기존 운영자 데이터 이전</summary><Typography.Paragraph type="secondary">예전 공용 기기의 설정과 게임을 한 번 이전하는 작업입니다. 현재 기기에 설정·포트폴리오·게임이나 계정 연결이 있으면 덮어쓰지 않고 중단합니다. 이전용 새 브라우저에서 별도 운영자 인증 후 진행하세요.</Typography.Paragraph><Button disabled={busy} onClick={() => void recover()}>기존 운영자 데이터 가져오기</Button></details>
  </Space></details>
}
