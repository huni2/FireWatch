// 웹과 앱의 종료 결과 문구·평가 상태를 같은 기준으로 계산한다.
export interface CompletionTurn {
  turnIndex: number; totalTurns: number; portfolioValue: number | null; returnPercent: number | null
  review: string[]; simulation: boolean
}
export function gameCompletion(turn: CompletionTurn) {
  const finished = turn.turnIndex === turn.totalTurns - 1
  const scored = turn.returnPercent != null && Number.isFinite(turn.returnPercent)
  return {
    title: finished ? `${turn.totalTurns}턴을 끝까지 플레이했어요` : '이번 게임을 마무리했어요',
    progress: `${turn.turnIndex + 1} / ${turn.totalTurns}턴`,
    score: scored ? `${turn.returnPercent! > 0 ? '+' : ''}${turn.returnPercent!.toFixed(2)}%` : '평가 미확정',
    tone: scored ? turn.returnPercent! < 0 ? 'negative' : turn.returnPercent! > 0 ? 'positive' : 'neutral' : 'neutral',
    value: turn.portfolioValue != null && Number.isFinite(turn.portfolioValue) ? turn.portfolioValue.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : '평가 미확정',
    canPublish: turn.simulation && turn.turnIndex > 0 && scored,
    reviews: turn.review.filter(text => text.trim().length > 0),
  }
}
