// 웹과 Android에 동일한 개인정보처리방침 전문을 표시한다.
import { Button, Card, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'
import policy from '../../../../shared/privacy-policy.json'
import './privacy.css'

const { Title, Paragraph } = Typography

export function PrivacyPage() {
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Title level={4} style={{ margin: 0 }}>개인정보처리방침</Title>
    <Card id="delete-account" title="FireWatch 계정·데이터 삭제 요청">
      <Paragraph>앱을 다시 설치하지 않아도 삭제를 요청할 수 있어요. 로그인할 수 있다면 내 계정에서 직접 삭제하고, 로그인할 수 없거나 기기별 기록도 삭제하려면 이메일로 요청해주세요.</Paragraph>
      <Space wrap><Link to="/account">내 계정에서 삭제하기 →</Link><Button href={`mailto:${policy.contactEmail}?subject=${encodeURIComponent('FireWatch 계정·데이터 삭제 요청')}`}>이메일로 삭제 요청</Button></Space>
      <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>요청 대상을 확인한 뒤 처리 결과를 안내합니다. 비밀번호·인증 토큰·계좌번호는 보내지 마세요. 아래에 자동 삭제 범위와 별도로 처리할 자료를 안내합니다.</Paragraph>
    </Card>
    <div className="privacy-layout">
      <nav className="privacy-toc" aria-label="개인정보처리방침 목차">
        {policy.sections.map((section, index) => <a key={section.title} href={`#privacy-section-${index}`}>{section.title}</a>)}
      </nav>
      <Card className="hoverable-card">
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Paragraph type="secondary" style={{ margin: 0 }}>시행일자: {policy.effectiveDate}</Paragraph>
          <Paragraph style={{ margin: 0 }}>{policy.intro}</Paragraph>
          {policy.sections.map((section, index) => <section key={section.title} id={`privacy-section-${index}`} className="privacy-section">
            <Title level={5}>{section.title}</Title>
            {section.blocks.map((block, blockIndex) => block.kind === 'bullet'
              ? <ul key={blockIndex} style={{ marginBlock: 8 }}><li>{block.text}</li></ul>
              : <Paragraph key={blockIndex}>{block.text}</Paragraph>)}
          </section>)}
        </Space>
      </Card>
    </div>
  </Space>
}
