// 브라우저 알림(Web Push) 구독 처리 — 권한 요청 → Service Worker 등록 → 구독 정보 생성까지만 담당.
// 백엔드 저장(updateSettings 호출)은 호출부(SettingsPage)가 한다 — 저장 안 된 편집 초안 값을
// 여기서 실수로 같이 저장해버리지 않기 위해서다.
import { useEffect, useState } from 'react'

import type { WebPushSubscriptionPayload } from '../../../lib/api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

export type WebPushStatus = 'unsupported' | 'denied' | 'ready'

export function useWebPushSubscription() {
  const [status, setStatus] = useState<WebPushStatus>('ready')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
    } else if (Notification.permission === 'denied') {
      setStatus('denied')
    }
  }, [])

  async function subscribe(): Promise<WebPushSubscriptionPayload> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('이 브라우저는 웹 푸시를 지원하지 않습니다.')
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus('denied')
      throw new Error('알림 권한이 거부되었습니다.')
    }
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    return subscription.toJSON() as WebPushSubscriptionPayload
  }

  return { status, subscribe }
}
