// 게임 결과를 먼저 보여주고 순위 공개는 사용자가 선택하게 한다.
import { Button, Modal } from 'antd'
import type { GameTurn } from '../../lib/api'
import { FirewatchIcon } from '../../components/FirewatchIcon'
import { gameCompletion } from '../../../../shared/game-completion'

export function GameCompletion({ turn, close, publish }: { turn: GameTurn; close: () => void; publish: () => void }) {
  const result = gameCompletion(turn)
  return <Modal open centered title={result.title} width={560} onCancel={close} className="game-completion-modal" styles={{ body: { maxHeight: 'calc(100dvh - 240px)', overflowY: 'auto' } }} footer={<div className="game-completion-actions"><Button onClick={close}>결과 화면 보기</Button>{result.canPublish && <Button type="primary" onClick={publish}>순위 등록 선택하기</Button>}</div>}>
    <section className="game-completion" aria-label="이번 게임 결과">
      <div className="game-completion-badge"><FirewatchIcon name="turn-result" size={36} /><span>가상투자 결과 · {result.progress}</span></div>
      <div className="game-completion-score"><span>시작 대비 수익률</span><strong className={result.tone}>{result.score}</strong><p>실제 투자 수익이나 내 보유 자산에 반영되지 않아요.</p></div>
      <div className="game-completion-value"><span>최종 총자산</span><strong>{result.value}<small> 게임머니</small></strong></div>
      {result.reviews.length > 0 && <div className="game-completion-review"><h3>이번 플레이 돌아보기</h3><ul>{result.reviews.slice(0, 2).map((text, index) => <li key={index}>{text}</li>)}</ul>{result.reviews.length > 2 && <details><summary>회고 더 보기</summary><ul>{result.reviews.slice(2).map((text, index) => <li key={index}>{text}</li>)}</ul></details>}</div>}
      <p className="game-completion-note">순위에는 자동으로 등록되지 않아요. 닉네임과 공개 범위를 확인한 뒤 결정할 수 있어요.</p>
    </section>
  </Modal>
}
