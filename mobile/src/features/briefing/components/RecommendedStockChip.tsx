import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { ActionButton } from '@/components/ActionButton'
import { fetchSettings, searchStocks, updateSettings } from '@/lib/api'
import { useSettings } from '../../settings/hooks/useSettings'
import { stockName } from '../../../../../shared/stock-labels'

// 이름만 있는 숨은 동작 대신 등록·해제와 처리 상태를 함께 표시한다.
export function RecommendedStockList({ stocks }: { stocks: string[] }) {
  const { settings, loading, accept, reload } = useSettings(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Record<string, string>>({})
  const locked = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  async function toggle(name: string) {
    if (locked.current || !settings) return
    locked.current = true; setBusy(name)
    try {
      const current = await fetchSettings()
      let ticker: string | undefined = resolved[name] ?? current.watchedStocks.find(symbol => stockName(symbol) === name || symbol === name)
      if (!ticker) {
        const results = await searchStocks(name)
        ticker = results.find(item => item.name === name || item.symbol === name)?.symbol ?? (results.length === 1 ? results[0].symbol : undefined)
      }
      if (!ticker) throw new Error('회사 이름을 확인하지 못했어요. 기업 탐색에서 회사를 선택해주세요.')
      if (!mounted.current) return
      const removing = current.watchedStocks.includes(ticker)
      if (!removing && current.watchedStocks.length >= 20) throw new Error('관심 기업은 최대 20개까지 담을 수 있어요.')
      const saved = await updateSettings({ watchedStocks: removing ? current.watchedStocks.filter(symbol => symbol !== ticker) : [...current.watchedStocks, ticker] })
      if (!mounted.current) return
      setResolved(previous => ({ ...previous, [name]: ticker! })); accept(saved)
      Toast.show({ type: 'success', text1: removing ? `${name} 관심 해제했어요` : `${name} 관심 기업에 담았어요` })
    } catch (e) {
      if (mounted.current) Toast.show({ type: 'error', text1: '관심 기업을 변경하지 못했어요', text2: e instanceof Error ? e.message : '다시 눌러주세요.' })
    } finally { locked.current = false; if (mounted.current) setBusy(null) }
  }
  return <View style={{ gap: 10 }}>
    <Text className="text-sm font-semibold text-muted">관찰 후보 · 관심 기업에 담아두세요</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{stocks.map(name => {
      const ticker = resolved[name] ?? settings?.watchedStocks.find(symbol => stockName(symbol) === name || symbol === name)
      const watched = !!ticker && !!settings?.watchedStocks.includes(ticker)
      return <ActionButton key={name} label={`${name} · ${watched ? '관심 해제' : '관심 추가'}`} onPress={() => void toggle(name)} disabled={!settings || busy !== null} busy={busy === name} />
    })}</View>
    {!loading && !settings && <ActionButton label="관심 목록 다시 확인" onPress={() => void reload()} />}
  </View>
}
