// 새 버전이 Play 스토어에 올라오면 앱을 막고 바로 업데이트하도록 안내한다(즉시 모드).
import { useEffect } from 'react'
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates'

export function useInAppUpdate() {
  useEffect(() => {
    const inAppUpdates = new SpInAppUpdates(false)
    inAppUpdates.checkNeedsUpdate()
      .then(result => { if (result.shouldUpdate) return inAppUpdates.startUpdate({ updateType: IAUUpdateKind.IMMEDIATE }) })
      .catch(() => { /* Play 스토어로 설치되지 않은 빌드(개발/사이드로드)에서는 정상적으로 실패한다. */ })
  }, [])
}
