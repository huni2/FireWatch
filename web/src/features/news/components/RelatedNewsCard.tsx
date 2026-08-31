import { Card, Empty, Skeleton, Typography } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import type { NewsArticle } from '../../../lib/api'

interface RelatedNewsCardProps {
  news: NewsArticle[]
  loading: boolean
  title?: string
  emptyDescription?: string
}

// Gemini Search Grounding이 무료 티어에서 막혀(Next-Tasks.md BE-3) 대신 RSS 피드로
// 실제 클릭 가능한 기사 링크를 보여준다 — 사용자 요청(2026-08-21)으로 추가된 화면 요소.
// title/emptyDescription을 prop으로 뺀 건 2026-09-01 — 대시보드 "오늘의 핫이슈" 섹션(WEB-7)에서도
// 동일 UI를 재사용하기 위해서다.
export function RelatedNewsCard({ news, loading, title = '관련 뉴스', emptyDescription = '관련 뉴스가 없습니다' }: RelatedNewsCardProps) {
  if (loading) {
    return (
      <Card title={title}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
      <Card className="hoverable-card" title={title}>
        {news.length === 0 ? (
          <Empty description={emptyDescription} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {news.map((article) => (
              <a
                key={article.link}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-link"
                style={{ display: 'block', color: 'inherit' }}
              >
                <Typography.Text strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LinkOutlined style={{ fontSize: 13, color: 'var(--ant-color-text-tertiary)' }} />
                  {article.title}
                </Typography.Text>
                {article.description && (
                  <Typography.Paragraph
                    type="secondary"
                    style={{ margin: '4px 0 0 19px', fontSize: 13 }}
                    ellipsis={{ rows: 2 }}
                  >
                    {article.description}
                  </Typography.Paragraph>
                )}
              </a>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
