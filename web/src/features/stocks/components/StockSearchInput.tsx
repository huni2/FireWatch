import { useRef, useState } from 'react'
import { Select, Spin } from 'antd'
import { searchStocks } from '../../../lib/api'

interface StockSearchInputProps {
  onSelect: (symbol: string) => void
}

const DEBOUNCE_MS = 300

// 종목 티커를 몰라도 이름으로 찾을 수 있게 — 2026-08-21 사용자 요청("종목이 뭐가 있는지 모르는데
// 검색을 어떻게 해야할지 모르겠다"). 백엔드가 국내 대형주 한글명은 로컬 별칭으로, 나머지는
// Yahoo 영문 검색으로 처리한다(한글 검색은 Yahoo 자체가 지원하지 않아 완전하진 않음).
export function StockSearchInput({ onSelect }: StockSearchInputProps) {
  const [value, setValue] = useState<string | undefined>(undefined)
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (query: string) => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setOptions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchStocks(query)
        setOptions(
          results.map((r) => ({
            value: r.symbol,
            label: `${r.name} (${r.symbol})${r.exchange ? ` · ${r.exchange}` : ''}`,
          })),
        )
      } catch {
        setOptions([])
      } finally {
        setSearching(false)
      }
    }, DEBOUNCE_MS)
  }

  return (
    <Select
      showSearch
      value={value}
      placeholder="종목명으로 검색 (예: 삼성전자, Apple)"
      filterOption={false}
      notFoundContent={searching ? <Spin size="small" /> : '검색 결과 없음 — 영문 사명으로도 시도해보세요'}
      onSearch={handleSearch}
      onSelect={(selectedValue: string) => {
        onSelect(selectedValue)
        setValue(undefined)
        setOptions([])
      }}
      options={options}
      style={{ width: '100%', maxWidth: 360 }}
    />
  )
}
