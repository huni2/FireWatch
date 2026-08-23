// web/src/features/settings/components/KeywordInput.tsx와 동일 동작(추가/삭제, 최대 20개) — RN 버전.
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

interface KeywordInputProps {
  value: string[]
  onChange: (next: string[]) => void
  maxCount?: number
}

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
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={addKeyword}
        onBlur={addKeyword}
        editable={value.length < maxCount}
        placeholder={value.length >= maxCount ? `최대 ${maxCount}개까지 등록 가능` : '키워드 입력 후 완료'}
        maxLength={30}
        returnKeyType="done"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-base"
      />
    </View>
  )
}
