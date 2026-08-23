import { Card, Space, Table, Typography } from 'antd'

const { Title, Paragraph, Text } = Typography

interface TickerExample {
  market: string
  suffix: string
  example: string
  name: string
}

const TICKER_EXAMPLES: TickerExample[] = [
  { market: '국내 · 코스피', suffix: '.KS', example: '005930.KS', name: '삼성전자' },
  { market: '국내 · 코스피', suffix: '.KS', example: '035420.KS', name: 'NAVER' },
  { market: '국내 · 코스닥', suffix: '.KQ', example: '086520.KQ', name: '에코프로' },
  { market: '해외', suffix: '(접미사 없음)', example: 'AAPL', name: 'Apple' },
  { market: '해외', suffix: '(접미사 없음)', example: 'TSLA', name: 'Tesla' },
]

interface GlossaryTerm {
  term: string
  desc: string
}

const GLOSSARY: GlossaryTerm[] = [
  { term: '코스피(KOSPI)', desc: '한국거래소 유가증권시장 — 삼성전자·SK하이닉스 같은 대형주가 속한 대표 국내 지수.' },
  { term: '코스닥(KOSDAQ)', desc: '코스피보다 규모가 작은 기업 위주의 국내 지수(중소·벤처 기업 비중이 높음).' },
  { term: 'S&P500', desc: '미국 대형 상장기업 500개로 구성된 대표 지수 — 미국 증시 전체 흐름을 보는 기준으로 가장 많이 쓰임.' },
  { term: '나스닥종합', desc: '미국 기술주 비중이 높은 지수 — 애플·테슬라 같은 기업들이 여기 속함.' },
  { term: '다우존스', desc: '미국의 오래된 대형 우량기업 30개로 구성된 지수.' },
  { term: '미국채 10년물 수익률', desc: '미국 정부가 발행하는 10년 만기 채권의 연 이자율(%) — 오르면 대체로 안전자산 선호·주식시장 부담 신호로 해석됨.' },
]

// 2026-08-23 사용자 요청 — "005930.ks이거랑 aapl 난 이런거 뭔지 잘 모르는데" 종목 티커 표기·
// 지수 용어를 처음 보는 사람도 이해할 수 있게 설명하는 페이지.
export function GuidePage() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={4} style={{ margin: 0 }}>
        가이드
      </Title>

      <Card className="hoverable-card" title="종목 티커가 뭔가요?">
        <Paragraph>
          <Text strong>티커(ticker)</Text>는 증시에서 개별 종목을 가리키는 약속된 코드예요. 국내 종목은 숫자 코드 뒤에
          거래소를 나타내는 접미사가 붙고, 해외 종목은 회사 이름을 줄인 영문 코드를 그대로 씁니다.
        </Paragraph>
        <Table<TickerExample>
          size="small"
          pagination={false}
          rowKey="example"
          dataSource={TICKER_EXAMPLES}
          columns={[
            { title: '시장', dataIndex: 'market' },
            { title: '접미사', dataIndex: 'suffix' },
            { title: '티커 예시', dataIndex: 'example' },
            { title: '종목명', dataIndex: 'name' },
          ]}
        />
        <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
          티커를 몰라도 <Text strong>종목</Text> 화면에서 이름으로 검색할 수 있어요 — 국내 대형주는 한글(예: "삼성전자"),
          나머지는 영문 사명(예: "Tesla")으로 찾으면 자동으로 정확한 티커가 채워집니다.
        </Paragraph>
      </Card>

      <Card className="hoverable-card" title="지수 화면에 나오는 용어">
        <Table<GlossaryTerm>
          size="small"
          pagination={false}
          rowKey="term"
          dataSource={GLOSSARY}
          columns={[
            { title: '용어', dataIndex: 'term', width: 180 },
            { title: '설명', dataIndex: 'desc' },
          ]}
        />
      </Card>
    </Space>
  )
}
