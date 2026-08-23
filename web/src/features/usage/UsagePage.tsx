import type { ReactNode } from 'react'
import { Card, Space, Typography } from 'antd'
import {
  AuditOutlined,
  DashboardOutlined,
  FundOutlined,
  LineChartOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SettingOutlined,
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

interface UsageSection {
  icon: ReactNode
  title: string
  desc: string
}

const MENU_SECTIONS: UsageSection[] = [
  {
    icon: <DashboardOutlined />,
    title: '대시보드',
    desc: '매일 아침 자동으로 생성되는 오늘의 증시 요약과 관심 종목 미니 요약을 보여줘요. 브리핑은 하루 한 번만 새로 만들어져요.',
  },
  {
    icon: <LineChartOutlined />,
    title: '종목',
    desc: '관심 종목을 등록하고 차트로 확인하는 화면이에요. 이름으로 검색해서 추가하거나(예: "삼성전자", "Tesla"), 정확한 티커를 알면 직접 입력할 수 있어요.',
  },
  {
    icon: <FundOutlined />,
    title: '지수',
    desc: '금/은/환율과 코스피·코스닥·S&P500 등 국내외 주요 지수, 미국채 수익률을 한눈에 보고 기간별 시계열 차트도 볼 수 있어요.',
  },
  {
    icon: <ReadOutlined />,
    title: '뉴스',
    desc: '오늘의 브리핑 요약이 참고한 실제 기사 목록이에요. 제목을 누르면 원문 기사로 이동해요.',
  },
  {
    icon: <QuestionCircleOutlined />,
    title: '가이드',
    desc: '종목 티커 표기법(예: 005930.KS)과 지수 화면에 나오는 용어(코스피, S&P500 등)를 설명해요.',
  },
  {
    icon: <AuditOutlined />,
    title: '감사로그',
    desc: '스케줄러·AI 요약·금융 데이터 호출 등 시스템이 실제로 언제 뭘 했는지 기록이에요 — 브리핑이 왜 평소와 다른지 확인할 때 유용해요.',
  },
  {
    icon: <SettingOutlined />,
    title: '설정',
    desc: '푸시 알림 받을 시간과 관심 키워드를 설정해요. 관심 종목은 여기가 아니라 종목 화면에서 관리해요.',
  },
]

// 2026-08-23 사용자 요청 — 화면별 용어 설명("가이드")과는 별개로, 앱 자체를 처음 쓰는
// 사람을 위해 메뉴별로 뭘 할 수 있는지 안내하는 페이지.
export function UsagePage() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={4} style={{ margin: 0 }}>
        사용방법
      </Title>

      <Card className="hoverable-card" title="메뉴별 기능">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {MENU_SECTIONS.map((section) => (
            <div key={section.title}>
              <Text strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {section.icon}
                {section.title}
              </Text>
              <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
                {section.desc}
              </Paragraph>
            </div>
          ))}
        </div>
      </Card>

      <Card className="hoverable-card" title="화면 조작 팁">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Paragraph style={{ margin: 0 }}>
            <Text strong>사이드바 접기/펼치기</Text> — 헤더 맨 왼쪽 아이콘을 누르면 왼쪽 사이드바를 완전히 숨기거나
            다시 보이게 할 수 있어요.
          </Paragraph>
          <Paragraph style={{ margin: 0 }}>
            <Text strong>다크 모드</Text> — 헤더 오른쪽 끝 스위치로 라이트/다크 화면을 전환해요.
          </Paragraph>
          <Paragraph style={{ margin: 0 }}>
            <Text strong>로딩이 오래 걸릴 때</Text> — 서버가 잠깐 쉬고 있다가 요청이 오면 다시 깨어나는 방식이라, 첫
            접속 시 최대 1분 정도 걸릴 수 있어요. "서버를 깨우는 중이에요" 안내가 뜨면 잠시 기다려주세요.
          </Paragraph>
        </Space>
      </Card>
    </Space>
  )
}
