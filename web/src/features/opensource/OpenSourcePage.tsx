import { ArrowLeftOutlined, DownloadOutlined, GithubOutlined } from '@ant-design/icons'
import { Button, Card, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import license from '../../vendor/threeui/LICENSE?raw'

export function OpenSourcePage() {
  return <div className="opensource-page">
    <div className="page-intro">
      <span className="eyebrow">BUILT WITH THE COMMUNITY</span>
      <Typography.Title level={2}>함께 만든 더 나은 경험.</Typography.Title>
      <Typography.Paragraph type="secondary">FireWatch에 직접 활용한 오픈소스 컴포넌트의 출처와 라이선스를 소개합니다.</Typography.Paragraph>
      <Link to="/"><Button icon={<ArrowLeftOutlined />}>메인으로 돌아가기</Button></Link>
    </div>
    <Card className="opensource-credit">
      <div className="opensource-credit-heading">
        <span className="opensource-symbol" aria-hidden="true"><GithubOutlined /></span>
        <div><Typography.Title level={3} style={{ margin: 0 }}>ThreeUI</Typography.Title><Typography.Text type="secondary">Meng To · UI 컴포넌트</Typography.Text></div>
        <Tag color="orange">MIT License</Tag>
      </div>
      <Typography.Paragraph>가상투자 게임의 공매도 설정 스위치는 ThreeUI의 ModernToggle을 바탕으로 만들었습니다. FireWatch의 색상과 크기, 선택 상태에 맞춰 수정해 사용합니다.</Typography.Paragraph>
      <Space wrap>
        <Button href="https://github.com/MengTo/threeui" target="_blank" rel="noopener noreferrer" icon={<GithubOutlined />}>원본 프로젝트 ↗</Button>
        <Button href="/third-party-notices.txt" download="firewatch-third-party-notices.txt" icon={<DownloadOutlined />}>고지 원문 다운로드</Button>
      </Space>
      <section className="opensource-license" aria-labelledby="license-title">
        <Typography.Title level={4} id="license-title">라이선스 원문</Typography.Title>
        <Typography.Paragraph type="secondary">제작자의 저작권 표시와 사용 조건을 원문 그대로 제공합니다.</Typography.Paragraph>
        <pre>{license}</pre>
      </section>
    </Card>
    <Typography.Paragraph type="secondary" className="opensource-scope">이 페이지는 직접 가져와 수정한 컴포넌트의 고지입니다. 전체 패키지 의존성 목록을 의미하지 않습니다.</Typography.Paragraph>
  </div>
}
