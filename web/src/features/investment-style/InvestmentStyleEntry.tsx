import { Link } from 'react-router-dom'
import { investmentStyleTitle } from '../../../../shared/investment-style'
export function InvestmentStyleEntry() {
  return <section className="investment-style-entry" aria-label={investmentStyleTitle}><div><h3>{investmentStyleTitle}</h3><p>10문항 · 약 2분 · 로그인 없이</p><p>내 상황과 지속하기 편한 관리 방식을 함께 살펴봐요.</p></div><Link to="/investment-style">내 투자 방식 살펴보기 →</Link></section>
}
