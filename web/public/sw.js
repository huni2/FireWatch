// 브라우저 알림(Web Push)을 수신·표시하는 Service Worker — 탭이 닫혀 있어도 동작한다.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'FireWatch', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'FireWatch'
  const body = data.body || ''
  event.waitUntil(self.registration.showNotification(title, { body, icon: '/favicon.png' }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus()
      return self.clients.openWindow('/')
    }),
  )
})
