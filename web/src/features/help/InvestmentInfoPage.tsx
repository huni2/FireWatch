import { Card, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { investmentNotice } from '../../../../shared/investmentNotice'

export function InvestmentInfoPage() {
  return <Space direction="vertical" size={20} style={{ width: '100%', maxWidth: 860 }}>
    <Typography.Title level={2}>투자 정보 이용안내</Typography.Title>
    <Typography.Text type="secondary">안내 기준일: {investmentNotice.version}</Typography.Text>
    <Card title="AI 분석과 투자 후보"><p>{investmentNotice.title} {investmentNotice.summary}</p><p>{investmentNotice.limitations}</p></Card>
    <Card title="내 포트폴리오"><p>{investmentNotice.portfolio}</p><p>보유 비중과 비교 정보는 입력한 자료를 바탕으로 계산하며, 누락된 자산과 미확인 시세는 전체 위험을 반영하지 못합니다. ISA·연금·ETF 조건은 금융회사와 운용사의 최신 설명서를 확인하세요.</p></Card>
    <Card title="가상투자 게임"><p>{investmentNotice.game}</p></Card>
    <Card title="투자 전에 확인하세요"><ol><li>자료의 기준 날짜와 분석 시각을 확인하세요.</li><li>추천 이유뿐 아니라 위험 요인과 연결된 기사 원문을 읽으세요.</li><li>공시·상품 설명서·실제 거래 시세를 별도로 확인하세요.</li><li>투자 금액과 손실을 감당할 수 있는 범위를 스스로 판단하세요.</li></ol></Card>
    <Typography.Paragraph>{investmentNotice.responsibility}</Typography.Paragraph>
    <Typography.Paragraph>자료 오류나 잘못된 분석을 발견하면 <a href="mailto:powerhch@gmail.com">powerhch@gmail.com</a>으로 화면과 기준 날짜를 알려주세요. 비밀번호나 로그인 토큰은 보내지 마세요.</Typography.Paragraph>
    <Link to="/candidates">기업 탐색으로 돌아가기</Link>
  </Space>
}
