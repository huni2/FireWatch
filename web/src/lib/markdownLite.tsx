// Gemini가 보내는 브리핑 텍스트(##/### 헤더, **볼드**, --- 구분선)를 최소 렌더링한다 — 범용 마크다운
// 렌더러가 아니라 이 프로젝트가 실제로 받는 패턴만 처리하는 가벼운 대체.
import type { ReactNode } from 'react'
import { Typography } from 'antd'

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  )
}

export function renderMarkdownLite(text: string): ReactNode {
  return text.split('\n').map((line, i) => {
    const key = `line-${i}`
    const trimmed = line.trim()

    if (trimmed === '---') {
      return <div key={key} style={{ borderTop: '1px solid var(--ant-color-border-secondary)', margin: '12px 0' }} />
    }
    if (trimmed === '') {
      return <div key={key} style={{ height: 8 }} />
    }

    const headerMatch = trimmed.match(/^#{1,6}\s+(.*)/)
    if (headerMatch) {
      return (
        <Typography.Title key={key} level={5} style={{ marginTop: 12, marginBottom: 8 }}>
          {renderInline(headerMatch[1], key)}
        </Typography.Title>
      )
    }

    return (
      <p key={key} style={{ margin: '2px 0' }}>
        {renderInline(line, key)}
      </p>
    )
  })
}
