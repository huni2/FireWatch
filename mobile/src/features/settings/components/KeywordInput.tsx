// web/src/features/settings/components/KeywordInput.tsx와 동일 동작(추가/삭제, 최대 20개) — RN 버전.
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

interface KeywordInputProps {
  value: string[]
  onChange: (next: string[]) => void
  maxCount?: number
  placeholder?: string
  /** 입력값이 유효하지 않으면 에러 메시지를, 유효하면 null — 없으면 자유 텍스트 허용(관심 키워드용 기본값). */
  validate?: (value: string) => string | null
  /** false면 입력창을 숨기고 태그 목록만 — 종목 화면(APP-8)이 검색/직접입력 탭을 전환할 때 사용. */
  showInput?: boolean
}

export function KeywordInput({
  value,
  onChange,
  maxCount = 20,
  placeholder = '키워드 입력 후 완료',
  validate,
  showInput = true,
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
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {value.map((keyword) => (
          <View
            key={keyword}
            className="flex-row items-center gap-1 rounded-full bg-neutral-100 py-1 pl-3 pr-2"
          >
            <Text className="text-sm text-neutral-700">{keyword}</Text>
            <Pressable onPress={() => onChange(value.filter((k) => k !== keyword))} hitSlop={8}>
              <Text className="text-sm text-neutral-400">✕</Text>
            </Pressable>
          </View>
        ))}
      </View>
      {showInput && (
        <>
          <TextInput
            value={draft}
            onChangeText={(text) => {
              setDraft(text)
              setError(null)
            }}
            onSubmitEditing={addKeyword}
            onBlur={addKeyword}
            editable={value.length < maxCount}
            placeholder={value.length >= maxCount ? `최대 ${maxCount}개까지 등록 가능` : placeholder}
            maxLength={30}
            returnKeyType="done"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
          {error && <Text className="text-xs text-red-500">{error}</Text>}
        </>
      )}
    </View>
  )
}
