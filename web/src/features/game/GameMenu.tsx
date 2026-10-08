import { Tooltip } from 'antd'
import { BookOutlined, HistoryOutlined, LogoutOutlined, TrophyOutlined, UploadOutlined } from '@ant-design/icons'
import mascot from '../../../../shared/assets/firewatch-lobby-scout.png'

interface Props {
  lobby?: boolean
  busy: boolean
  canPublish?: boolean
  canReplay?: boolean
  canEnd?: boolean
  onRules: () => void
  onRanking: () => void
  onPublish: () => void
  onReplay: () => void
  onEnd: () => void
}

export function GameMenu({ lobby, busy, canPublish, canReplay, canEnd, onRules, onRanking, onPublish, onReplay, onEnd }: Props) {
  const actions = [
    { name: '주간 순위', label: '순위', description: '이번 주 순위와 지난 주 우승자', icon: <TrophyOutlined />, action: onRanking, disabled: false },
    { name: '게임 규칙', label: '규칙', description: '가상 가격·거래·턴의 작동 방식', icon: <BookOutlined />, action: onRules, disabled: false },
    ...(!lobby ? [
      { name: '이 턴 기록 등록', label: '등록', description: canPublish ? '동의한 기록만 닉네임으로 공개' : '한 턴 이상 진행한 가상 게임 기록을 등록할 수 있습니다.', icon: <UploadOutlined />, action: onPublish, disabled: !canPublish },
      { name: '지난 턴 복기', label: '복기', description: canReplay ? '내 거래와 가격 변화 다시보기' : '다음 턴을 진행하면 복기를 볼 수 있습니다.', icon: <HistoryOutlined />, action: onReplay, disabled: !canReplay },
      { name: '게임 종료', label: '종료', description: '확인 후 현재 기록으로 마무리', icon: <LogoutOutlined />, action: onEnd, disabled: !canEnd },
    ] : []),
  ]
  return <div className={`game-quick-menu ${lobby ? 'lobby' : 'compact'}`}>
    {lobby && <img className="game-lobby-mascot" src={mascot} alt="FireWatch 불꽃 정찰대" />}
    <nav className="game-quick-actions" aria-label="게임 도구">
      {actions.map(item => <Tooltip key={item.name} title={item.description} trigger={['hover', 'focus']}>
        <span><button type="button" aria-label={item.name} disabled={busy || item.disabled} onClick={item.action}>
          <span aria-hidden="true">{item.icon}</span><span>{item.label}</span>
        </button></span>
      </Tooltip>)}
    </nav>
  </div>
}
