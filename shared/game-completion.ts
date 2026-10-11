// 웹과 앱의 종료 결과 문구·평가 상태를 같은 기준으로 계산한다.
export interface CompletionTurn {
  turnIndex: number; totalTurns: number; portfolioValue: number | null; returnPercent: number | null
  review: string[]; simulation: boolean; simulationVersion?: number | null
}
export function gameCompletion(turn: CompletionTurn) {
  const finished = turn.turnIndex === turn.totalTurns - 1
  const period = (turn.simulationVersion ?? 0) >= 3 ? '주' : '턴'
  const scored = turn.returnPercent != null && Number.isFinite(turn.returnPercent)
  return {
    title: finished ? `${turn.totalTurns}${period} 동안의 투자가 끝났어요` : '이번 게임을 마무리했어요',
    progress: `${turn.turnIndex + 1} / ${turn.totalTurns}${period}`,
    score: scored ? `${turn.returnPercent! > 0 ? '+' : ''}${turn.returnPercent!.toFixed(2)}%` : '평가 미확정',
    tone: scored ? turn.returnPercent! < 0 ? 'negative' : turn.returnPercent! > 0 ? 'positive' : 'neutral' : 'neutral',
    value: turn.portfolioValue != null && Number.isFinite(turn.portfolioValue) ? turn.portfolioValue.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : '평가 미확정',
    canPublish: turn.simulation && (turn.simulationVersion ?? 0) >= 3 && finished && scored,
    reviews: turn.review.filter(text => text.trim().length > 0),
  }
}
