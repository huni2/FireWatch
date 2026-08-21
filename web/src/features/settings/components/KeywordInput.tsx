import { useState } from 'react'
import { Input, Space, Tag, Typography } from 'antd'

interface KeywordInputProps {
  value: string[]
  onChange: (next: string[]) => void
  maxCount?: number
  placeholder?: string
  /** 입력값이 유효하지 않으면 에러 메시지를, 유효하면 null을 반환 — 없으면 자유 텍스트 그대로 허용(관심 키워드용 기본값). */
  validate?: (value: string) => string | null
}

// Design Ref: §5.4 Settings 체크리스트 — 관심 키워드 추가(Enter)/삭제, 최대 20개. 종목 화면(관심 종목)에서도 재사용.
export function KeywordInput({
  value,
  onChange,
  maxCount = 20,
  placeholder = '키워드 입력 후 Enter',
  validate,
}: KeywordInputProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addKeyword = () => {
    const trimmed = draft.trim()
    if (!trimmed || value.includes(trimmed) || value.length >= maxCount) {
      setDraft('')
      setError(null)
      return
    }
    const validationError = validate?.(trimmed) ?? null
    if (validationError) {
      setError(validationError)
      return
    }
    onChange([...value, trimmed])
    setDraft('')
    setError(null)
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
        status={error ? 'error' : undefined}
        placeholder={value.length >= maxCount ? `최대 ${maxCount}개까지 등록 가능` : placeholder}
        value={draft}
        disabled={value.length >= maxCount}
        onChange={(e) => {
          setDraft(e.target.value)
          setError(null)
        }}
        onPressEnter={addKeyword}
        onBlur={addKeyword}
        maxLength={30}
        style={{ maxWidth: 320 }}
      />
      {error && (
        <Typography.Text type="danger" style={{ fontSize: 12 }}>
          {error}
        </Typography.Text>
      )}
    </Space>
  )
}
