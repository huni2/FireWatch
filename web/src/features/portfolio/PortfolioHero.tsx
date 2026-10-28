// 체크업 카드 안에 묻혀있던 총자산 숫자를 화면 맨 위 독립된 히어로로 분리 — "0.5초 안에 보이는" 숫자.
import type { Portfolio } from '../../../../shared/investing'
import { portfolioCheckup } from '../../../../shared/portfolio-checkup'

export function PortfolioHero({ portfolio }: { portfolio: Portfolio }) {
  const check = portfolioCheckup(portfolio)
  const hasValue = check.pricedCount > 0 || portfolio.cash > 0
  const total = check.complete ? portfolio.totalValueKrw : check.includedValue
  return <div className="portfolio-hero">
    <span className="portfolio-hero-label">내 총 자산</span>
    <strong className="portfolio-hero-amount">{hasValue && total != null ? `${total.toLocaleString('ko-KR')}원` : '평가 자료 확인 중'}</strong>
    <span className="portfolio-hero-caption">{check.complete ? '등록한 자산과 현금 기준' : `확인된 자산과 현금 기준 · 일부`} · {check.asOf}</span>
  </div>
}
