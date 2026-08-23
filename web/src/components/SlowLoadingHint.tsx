import { Typography } from 'antd'

interface SlowLoadingHintProps {
  loading: boolean
  isSlow: boolean
}

// Render 무료 티어 콜드스타트가 최대 90초+ 걸릴 수 있어(useApi 재시도 로직 참고) — 스켈레톤만
// 계속 떠 있으면 고장난 것처럼 보인다는 지적(2026-08-23). 로딩이 일정 시간 넘게 걸리면 이유를 알려준다.
export function SlowLoadingHint({ loading, isSlow }: SlowLoadingHintProps) {
  if (!loading || !isSlow) return null
  return (
    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
      서버를 깨우는 중이에요 — 최대 1분 정도 걸릴 수 있어요.
    </Typography.Text>
  )
}
