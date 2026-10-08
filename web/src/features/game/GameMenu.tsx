import { useState } from 'react'
import { Dropdown } from 'antd'
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
  const [open, setOpen] = useState(false)
  const label = (title: string, description: string) => <span className="game-menu-label"><strong>{title}</strong><small>{description}</small></span>
  return <Dropdown overlayClassName="game-scout-dropdown" open={!busy && open} onOpenChange={setOpen}
    trigger={['hover', 'click']} placement={lobby ? 'bottom' : 'bottomRight'}
    menu={{ items: [
      { key: 'ranking', icon: <TrophyOutlined />, label: label('주간 순위', '이번 주 순위와 지난 주 우승자') },
      { key: 'rules', icon: <BookOutlined />, label: label('게임 규칙', '가상 가격·거래·턴의 작동 방식') },
      ...(!lobby ? [
        { key: 'publish', icon: <UploadOutlined />, label: label('이 턴 기록 등록', '동의한 기록만 닉네임으로 공개'), disabled: !canPublish },
        { key: 'replay', icon: <HistoryOutlined />, label: label('지난 턴 복기', '내 거래와 가격 변화 다시보기'), disabled: !canReplay },
        { type: 'divider' as const },
        { key: 'end', icon: <LogoutOutlined />, label: label('게임 종료', '확인 후 현재 기록으로 마무리'), disabled: !canEnd, danger: true },
      ] : []),
    ], onClick: ({ key }) => {
      setOpen(false)
      if (key === 'ranking') onRanking()
      if (key === 'rules') onRules()
      if (key === 'publish') onPublish()
      if (key === 'replay') onReplay()
      if (key === 'end') onEnd()
    } }}>
    <button type="button" className={`game-scout-launcher ${lobby ? 'lobby' : 'compact'}`} disabled={busy}
      aria-label="게임 메뉴" aria-haspopup="menu" aria-expanded={!busy && open}
      onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true) } }}>
      <img src={mascot} alt="" /><span>{lobby ? '순위·규칙 보기' : '메뉴'}</span>
    </button>
  </Dropdown>
}
