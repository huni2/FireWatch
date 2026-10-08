import { Card, Empty, Skeleton, Typography } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import type { NewsArticle } from '../../../lib/api'
import { SECTION_CARD_PROPS } from '../../../lib/theme'
import { articleText } from '../../../../../shared/article-text'

interface RelatedNewsCardProps {
  news: NewsArticle[]
  loading: boolean
  title?: string | null
  emptyDescription?: string
  // 뉴스 화면에서는 페이지의 유일한 콘텐츠라 박스 카드로, 대시보드 핫이슈 섹션에서는 2026-10-05
  // 재설계로 지면의 한 섹션처럼(변수 없이) 보여야 해 false로 넘긴다.
  boxed?: boolean
}

// Gemini Search Grounding이 무료 티어에서 막혀(Next-Tasks.md BE-3) 대신 RSS 피드로
// 실제 클릭 가능한 기사 링크를 보여준다 — 사용자 요청(2026-08-21)으로 추가된 화면 요소.
// title/emptyDescription을 prop으로 뺀 건 2026-09-01 — 대시보드 "오늘의 핫이슈" 섹션(WEB-7)에서도
// 동일 UI를 재사용하기 위해서다.
export function RelatedNewsCard({
  news,
  loading,
  title = '관련 뉴스',
  emptyDescription = '관련 뉴스가 없습니다',
  boxed = true,
}: RelatedNewsCardProps) {
  const cardProps = boxed ? { className: 'hoverable-card' } : SECTION_CARD_PROPS

  if (loading) {
    return (
      <Card {...cardProps} title={title}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
      <Card {...cardProps} title={title}>
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
                  {articleText(article.title)}
                  {/* 새 탭으로 열린다는 걸 "링크다"보다 명확하게 — LinkOutlined는 그냥 사슬 아이콘이라
                      새 탭 안내로 안 읽힌다는 지적(2026-10-05) */}
                  <ExportOutlined style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)' }} />
                </Typography.Text>
                <Typography.Text className="article-meta" style={{ display: 'block', marginTop: 6 }}>{(() => { try { return new URL(article.link).hostname.replace(/^www\./, '') } catch { return '원문 출처 확인 필요' } })()}{article.pubDate ? ' · ' + new Date(article.pubDate).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' KST' : ' · 발행 시각 미확인'}</Typography.Text>
                {article.description && (
                  <Typography.Paragraph
                    className="article-description"
                    style={{ margin: '6px 0 0', fontSize: 14 }}
                    ellipsis={{ rows: 2 }}
                  >
                    {articleText(article.description)}
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
