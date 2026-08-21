import { Card, Empty, Skeleton, Typography } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import type { NewsArticle } from '../../../lib/api'

interface RelatedNewsCardProps {
  news: NewsArticle[]
  loading: boolean
}

// Gemini Search Grounding이 무료 티어에서 막혀(Next-Tasks.md BE-3) 대신 네이버 뉴스 검색 API로
// 실제 클릭 가능한 기사 링크를 보여준다 — 사용자 요청(2026-08-21)으로 추가된 화면 요소.
export function RelatedNewsCard({ news, loading }: RelatedNewsCardProps) {
  if (loading) {
    return (
      <Card title="관련 뉴스">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
      <Card className="hoverable-card" title="관련 뉴스">
        {news.length === 0 ? (
          <Empty description="관련 뉴스가 없습니다" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {news.map((article) => (
              <a
                key={article.link}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
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
