import { Alert } from 'antd'
import { Link } from 'react-router-dom'
import { investmentNotice } from '../../../shared/investmentNotice'

export function InvestmentNotice() {
  return <Alert type="warning" showIcon message={investmentNotice.title} description={<>{investmentNotice.summary}<details style={{ marginTop: 8 }}><summary>분석의 한계와 이용 시 확인할 점</summary><p>{investmentNotice.limitations}</p><Link to="/investment-info">투자 정보 이용안내</Link></details></>} />
}
