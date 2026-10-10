import { useEffect, useId, useRef, useState } from 'react'
import type { ElementRef } from 'react'
import { Button, Select, Spin } from 'antd'
import { searchStocks } from '../../../lib/api'
import { stockLabel } from '../../../../../shared/stock-labels'

interface StockSearchInputProps {
  onSelect: (symbol: string, name?: string) => void
  initialQuery?: string
}

const DEBOUNCE_MS = 300

// 종목 티커를 몰라도 이름으로 찾을 수 있게 — 2026-08-21 사용자 요청("종목이 뭐가 있는지 모르는데
// 검색을 어떻게 해야할지 모르겠다"). 백엔드가 국내 대형주 한글명은 로컬 별칭으로, 나머지는
// Yahoo 영문 검색으로 처리한다(한글 검색은 Yahoo 자체가 지원하지 않아 완전하진 않음).
export function StockSearchInput({ onSelect, initialQuery = '' }: StockSearchInputProps) {
  const [query, setQuery] = useState(initialQuery)
  const requestNumber = useRef(0)
  const [value, setValue] = useState<string | undefined>(undefined)
  const [options, setOptions] = useState<{ value: string; label: string; name: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const [searched, setSearched] = useState(false)
  const statusId = useId()
  const searchRef = useRef<ElementRef<typeof Select>>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = (query: string) => {
    setQuery(query)
    const id = ++requestNumber.current
    clearTimeout(debounceRef.current)
    setOptions([])
    setFailed(false)
    setSearched(false)
    setSearching(!!query.trim())
    if (!query.trim()) {
      setOptions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchStocks(query)
        if (id !== requestNumber.current) return
        setOptions(
          results.map((r) => ({
            value: r.symbol,
            name: r.name,
            label: stockLabel(r.symbol, { [r.symbol]: r.name }),
          })),
        )
      } catch {
        if (id === requestNumber.current) setFailed(true)
      } finally {
        if (id === requestNumber.current) { setSearching(false); setSearched(true) }
      }
    }, DEBOUNCE_MS)
  }

  useEffect(() => {
    const pendingSearch = requestNumber
    if (initialQuery) handleSearch(initialQuery)
    return () => { clearTimeout(debounceRef.current); pendingSearch.current++ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
    <Select
      ref={searchRef}
      aria-label="회사·상품 이름 검색"
      aria-describedby={statusId}
      showSearch
      searchValue={query}
      value={value}
      placeholder="종목명으로 검색 (예: 삼성전자, Apple)"
      filterOption={false}
      notFoundContent={searching ? <Spin size="small" /> : failed ? '검색을 불러오지 못했어요. 아래에서 다시 시도해주세요.' : searched ? '일치하는 회사가 없어요. 이름을 바꿔 검색해보세요.' : '회사나 상품 이름을 입력해주세요.'}
      onSearch={handleSearch}
      onSelect={(selectedValue: string) => {
        ++requestNumber.current
        clearTimeout(debounceRef.current)
        onSelect(selectedValue, options.find(option => option.value === selectedValue)?.name)
        setValue(undefined)
        setQuery('')
        setOptions([])
        setSearching(false)
        setFailed(false)
        setSearched(false)
      }}
      options={options}
      style={{ width: '100%' }}
    />
    <div id={statusId} role="status" aria-live="polite" aria-atomic="true" style={{ marginTop: 8, color: 'var(--ant-color-text-secondary)' }}>
      {searching ? '회사를 찾고 있어요.' : failed ? '검색을 불러오지 못했어요. 입력한 이름은 유지했어요.' : searched ? options.length ? `검색 결과 ${options.length}개. 방향키로 선택할 수 있어요.` : '일치하는 회사가 없어요. 이름을 바꿔 검색해보세요.' : null}
    </div>
    {failed && <Button onClick={() => { searchRef.current?.focus(); handleSearch(query) }} style={{ marginTop: 8, minHeight: 44 }}>검색 다시 시도</Button>}
    </div>
  )
}
