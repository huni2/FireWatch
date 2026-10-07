import { Link } from 'react-router-dom'
import { investmentNotice } from '../../../shared/investmentNotice'

export function InvestmentNotice() {
  return <aside className="investment-notice" aria-label="투자 정보 이용 안내"><div><strong>AI 분석은 참고 정보입니다.</strong><span>원금 손실 가능성이 있으며 수익을 보장하지 않습니다.</span></div><details><summary>분석의 한계와 이용 시 확인할 점</summary><p>{investmentNotice.summary}</p><p>{investmentNotice.limitations}</p><Link to="/investment-info">투자 정보 이용안내</Link></details></aside>
}
