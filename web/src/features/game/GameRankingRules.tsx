// 등록 전에 자격을 확인하고 상세 산정 규칙은 필요할 때 펼쳐 읽는다.
import { rankingEligibility, rankingFairness, rankingInitialFunds, rankingRules } from '../../../../shared/game-ranking-rules'

export function GameRankingRules() {
  return <section className="ranking-rules" aria-label="순위 등록과 산정 기준">
    <p>{rankingEligibility}</p>
    <p>{rankingInitialFunds}</p>
    <details><summary>순위 등록·산정 기준 보기</summary><dl>{rankingRules.map(rule => <div key={rule.title}><dt>{rule.title}</dt><dd>{rule.body}</dd></div>)}</dl><p>{rankingFairness}</p></details>
  </section>
}
