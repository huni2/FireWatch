import { useEffect, useRef, useState } from 'react'
import type { ElementRef } from 'react'
import { AutoComplete, Button, Input, Spin } from 'antd'
import { request } from '../../lib/api'
import { searchHoldingCatalog, holdingSearchDescription, type HoldingSearchResult } from '../../../../shared/holding-search'

export function HoldingSearch({ id, registered, onSelect, onQueryChange }: { id: string; registered: string[]; onSelect: (item: HoldingSearchResult) => void; onQueryChange: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HoldingSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [retry, setRetry] = useState(0)
  const [open, setOpen] = useState(false)
  const input = useRef<ElementRef<typeof AutoComplete>>(null)
  const generation = useRef(0)
  const page = useRef(0)
  const busy = useRef(false)
  useEffect(() => {
    const requests = generation
    const token = ++requests.current
    page.current = 0; busy.current = false
    if (!query.trim()) return
    const timer = setTimeout(async () => {
      if (token !== generation.current) return
      busy.current = true
      try {
        const found = await searchHoldingCatalog(request, query)
        if (token !== generation.current) return
        setResults(found.results); setHasMore(found.hasMore); setTotal(found.total)
      } catch { if (token === generation.current) setError(true) }
      finally { if (token === generation.current) { busy.current = false; setLoading(false) } }
    }, 300)
    return () => { clearTimeout(timer); requests.current++ }
  }, [query, retry])
  async function more() {
    if (busy.current || loading || !hasMore) return
    const token = generation.current, next = page.current + 1
    busy.current = true; setLoading(true); setError(false)
    try {
      const found = await searchHoldingCatalog(request, query, next)
      if (token !== generation.current) return
      page.current = next
      setResults(previous => [...previous, ...found.results.filter(item => !previous.some(row => row.symbol === item.symbol))])
      setHasMore(found.hasMore); setTotal(found.total)
    } catch { if (token === generation.current) setError(true) }
    finally { if (token === generation.current) { busy.current = false; setLoading(false) } }
  }
  function changeQuery(text: string) {
    generation.current++; setQuery(text); setOpen(!!text.trim()); setResults([]); setError(false); setHasMore(false); setTotal(0); setLoading(!!text.trim()); onQueryChange()
  }
  return <div className="holding-search">
    <label htmlFor={id}>주식·ETF 검색</label>
    <AutoComplete ref={input} open={open} onOpenChange={setOpen} filterOption={false} value={query}
      style={{ width: '100%' }} listHeight={300} virtual={false}
      onSearch={changeQuery}
      onSelect={(_symbol, option) => { setOpen(false); onSelect(option.result as HoldingSearchResult) }}
      notFoundContent={loading ? <Spin size="small" /> : error ? '검색을 불러오지 못했어요.' : query.trim() ? '검색 결과가 없어요.' : '이름이나 종목코드를 입력해주세요.'}
      options={results.map(item => ({ value: item.symbol, result: item, label: <div className="holding-search-result"><strong>{item.name}{registered.includes(item.symbol.toUpperCase()) && <span className="holding-registered">등록됨</span>}</strong><small>{holdingSearchDescription(item)}</small></div> }))}
      onPopupScroll={event => { const node = event.currentTarget; if (node.scrollHeight - node.scrollTop - node.clientHeight < 40) void more() }}
      dropdownRender={menu => <>{menu}{hasMore && <Button block type="text" loading={loading} onMouseDown={event => event.preventDefault()} onClick={() => void more()}>검색 결과 더 보기</Button>}</>}>
      <Input id={id} aria-label="주식·ETF 검색" aria-describedby={`${id}-status`} allowClear autoFocus placeholder="회사명, ETF명 또는 종목코드" size="large" />
    </AutoComplete>
    {!query.trim() && <div className="holding-search-examples" aria-label="검색어 예시"><small>검색 예시</small>{['삼성전자', '애플', 'TIGER'].map(example => <Button key={example} type="text" onClick={() => { changeQuery(example); input.current?.focus() }}>{example}</Button>)}<small>예시를 누르면 관련 종목을 검색해요.</small></div>}
    <div id={`${id}-status`} role="status" aria-live="polite">
      {loading ? '검색 중…' : error ? '검색을 불러오지 못했어요. 입력한 검색어는 유지했어요.' : query.trim() ? total ? `검색 결과 ${total}개 · 방향키와 Enter로 선택할 수 있어요.` : '등록 가능한 목록에 없어요. 다른 이름이나 종목코드로 검색해보세요.' : '검색 결과에서 보유한 종목을 선택해주세요.'}
    </div>
    {error && <Button onClick={() => { input.current?.focus(); setOpen(true); if (results.length && hasMore) void more(); else { setError(false); setLoading(true); setRetry(value => value + 1) } }}>다시 시도</Button>}
  </div>
}
