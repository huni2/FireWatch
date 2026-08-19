import { useState } from 'react'
import { Input, Space, Tag } from 'antd'

interface KeywordInputProps {
  value: string[]
  onChange: (next: string[]) => void
  maxCount?: number
}

// Design Ref: §5.4 Settings 체크리스트 — 관심 키워드 추가(Enter)/삭제, 최대 20개
export function KeywordInput({ value, onChange, maxCount = 20 }: KeywordInputProps) {
  const [draft, setDraft] = useState('')

  const addKeyword = () => {
    const trimmed = draft.trim()
    if (!trimmed || value.includes(trimmed) || value.length >= maxCount) {
      setDraft('')
      return
    }
    onChange([...value, trimmed])
    setDraft('')
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space wrap>
        {value.map((keyword) => (
          <Tag key={keyword} closable onClose={() => onChange(value.filter((k) => k !== keyword))}>
            {keyword}
          </Tag>
        ))}
      </Space>
      <Input
        placeholder={value.length >= maxCount ? `최대 ${maxCount}개까지 등록 가능` : '키워드 입력 후 Enter'}
        value={draft}
        disabled={value.length >= maxCount}
        onChange={(e) => setDraft(e.target.value)}
        onPressEnter={addKeyword}
        onBlur={addKeyword}
        maxLength={30}
        style={{ maxWidth: 320 }}
      />
    </Space>
  )
}
