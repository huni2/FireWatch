import type { Portfolio, PortfolioReviewCheckpoint } from './investing'
import { portfolioAsOf } from './portfolio-asof'
import { articleText } from './article-text'

export interface CheckupFinding { kind: 'largest' | 'index' | 'sector' | 'currency'; title: string; detail: string; symbol?: string }
export interface WeightChange { symbol: string; name: string; before: number; after: number; difference: number }
const number = (value: number, digits = 1) => value.toLocaleString('ko-KR', { maximumFractionDigits: digits })
const valued = (row: Portfolio['holdings'][number]) => row.valueKrw != null && Number.isFinite(row.valueKrw) && row.valueKrw >= 0
const time = (value: string | null) => value ? Date.parse(value) : NaN
const normalizeIndex = (value: string) => value.toUpperCase().replace(/[\s&._-]/g, '')
export function checkpointDate(value: string): string {
  return Number.isFinite(time(value)) ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '점검 날짜 확인 필요'
}

function weights(rows: Portfolio['holdings'], total: number) {
  return new Map(rows.filter(valued).map(row => [row.holding.symbol, { name: row.holding.name, weight: total > 0 ? row.valueKrw! / total * 100 : 0 }]))
}
function recordChanges(portfolio: Portfolio, previous: PortfolioReviewCheckpoint): string[] {
  const before = new Map(previous.holdings.map(row => [row.holding.symbol, row.holding]))
  const after = new Set(portfolio.holdings.map(row => row.holding.symbol))
  const changes: string[] = []
  for (const { holding } of portfolio.holdings) {
    const old = before.get(holding.symbol)
    if (!old) changes.push(`${holding.name} 보유 기록 추가`)
    else {
      const fields: string[] = []
      if (old.quantity !== holding.quantity) fields.push(`수량 ${number(old.quantity, 4)}주 → ${number(holding.quantity, 4)}주`)
      if (old.averageCost !== holding.averageCost) fields.push('평균 구매 가격 수정')
      if (old.name !== holding.name || old.currency !== holding.currency || old.assetClass !== holding.assetClass || old.sector !== holding.sector || old.region !== holding.region || old.underlyingIndex !== holding.underlyingIndex) fields.push('종목 정보 수정')
      if (fields.length) changes.push(`${holding.name} ${fields.join(' · ')}`)
    }
  }
  for (const old of before.values()) if (!after.has(old.symbol)) changes.push(`${old.name} 보유 기록 삭제`)
  if (portfolio.cash !== previous.cash) changes.push(`현금 ${number(previous.cash, 2)}원 → ${number(portfolio.cash, 2)}원`)
  return changes
}

// Describe retained data. Missing valuations never become zero-valued holdings or investment advice.
export function portfolioCheckup(portfolio: Portfolio, now = Date.now()) {
  const priced = portfolio.holdings.filter(valued)
  const missing = portfolio.holdings.filter(row => !valued(row))
  const includedValue = portfolio.cash + priced.reduce((sum, row) => sum + row.valueKrw!, 0)
  const complete = missing.length === 0 && portfolio.totalValueKrw != null && Number.isFinite(portfolio.totalValueKrw)
  const basis = missing.length ? `가격·환율이 확인된 ${priced.length}/${portfolio.holdings.length}개 자산과 현금 기준` : '등록한 자산과 현금 기준'
  const stale = priced.filter(row => !Number.isFinite(time(row.quoteAsOf)) || time(row.quoteAsOf) > now || now - time(row.quoteAsOf) > 3 * 86400000)
  const usd = priced.some(row => row.holding.currency === 'USD')
  const fxTime = time(portfolio.fxAsOf ? `${portfolio.fxAsOf}T00:00:00+09:00` : null)
  const staleFx = usd && (!Number.isFinite(fxTime) || fxTime > now || now - fxTime > 3 * 86400000)
  const findings: CheckupFinding[] = []
  const largest = [...priced].sort((a, b) => b.valueKrw! - a.valueKrw!)[0]
  if (largest && includedValue > 0) findings.push({ kind: 'largest', title: `${largest.holding.name} 비중 ${number(largest.valueKrw! / includedValue * 100)}%`, detail: `보유 종목 중 가장 큰 비중이에요. ${basis}이에요.`, symbol: largest.holding.symbol })
  const groups = new Map<string, { index: string; names: string[] }>()
  for (const { holding } of portfolio.holdings) if (holding.assetClass === 'ETF' && holding.underlyingIndex.trim()) {
    const key = normalizeIndex(holding.underlyingIndex), group = groups.get(key) ?? { index: holding.underlyingIndex.trim(), names: [] }
    group.names.push(holding.name); groups.set(key, group)
  }
  const overlap = [...groups.values()].find(group => group.names.length > 1)
  if (overlap) findings.push({ kind: 'index', title: `같은 지수명의 ETF ${overlap.names.length}개`, detail: `${overlap.names.join(' · ')} · ${overlap.index}. 등록된 지수명 비교이며 실제 구성 종목의 중복은 분석하지 않았어요.` })
  const sectors = new Map<string, number>()
  for (const row of priced) if (row.holding.assetClass === 'STOCK' && row.holding.sector.trim() && row.holding.sector !== '미분류') sectors.set(row.holding.sector, (sectors.get(row.holding.sector) ?? 0) + row.valueKrw!)
  const sector = [...sectors].sort((a, b) => b[1] - a[1])[0]
  if (sector && includedValue > 0 && sector[1] / includedValue >= 0.5 && priced.length > 1) findings.push({ kind: 'sector', title: `등록된 ${sector[0]} 분야 ${number(sector[1] / includedValue * 100)}%`, detail: `기록된 개별주식 분야를 합산했어요. ${basis}이며 ETF 속 기업은 포함하지 않았어요.` })
  const usdValue = priced.filter(row => row.holding.currency === 'USD').reduce((sum, row) => sum + row.valueKrw!, 0)
  if (usdValue > 0 && includedValue > 0) findings.push({ kind: 'currency', title: `달러 거래 자산 ${number(usdValue / includedValue * 100)}%`, detail: '거래 통화 기준이에요. 원화로 거래하는 해외 ETF의 환율 노출까지 계산한 값은 아니에요.' })

  const previous = portfolio.reviewCheckpoint
  const baselineComplete = !!previous && previous.totalValueKrw != null && Number.isFinite(previous.totalValueKrw) && previous.totalValueKrw > 0 && previous.holdings.every(valued)
  const canCompareWeights = !!previous && complete && portfolio.totalValueKrw! > 0 && baselineComplete
  const weightChanges: WeightChange[] = []
  if (canCompareWeights && previous) {
    const before = weights(previous.holdings, previous.totalValueKrw!), after = weights(portfolio.holdings, portfolio.totalValueKrw!)
    for (const symbol of new Set([...before.keys(), ...after.keys()])) {
      const old = before.get(symbol), current = after.get(symbol), difference = (current?.weight ?? 0) - (old?.weight ?? 0)
      if (Math.abs(difference) >= 0.1) weightChanges.push({ symbol, name: current?.name ?? old!.name, before: old?.weight ?? 0, after: current?.weight ?? 0, difference })
    }
    weightChanges.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
  }
  const seen = new Set(previous?.newsLinks ?? [])
  const news = [...new Map(portfolio.relatedNews.filter(article => /^https?:\/\//i.test(article.link) && articleText(article.title).trim() && (!Number.isFinite(time(article.pubDate)) || time(article.pubDate) <= now))
    .map(article => [article.link, article])).values()].sort((a, b) => (Number.isFinite(time(b.pubDate)) ? time(b.pubDate) : 0) - (Number.isFinite(time(a.pubDate)) ? time(a.pubDate) : 0))
    .map(article => ({ ...article, title: articleText(article.title), isNew: !!previous && !seen.has(article.link) && Number.isFinite(time(article.pubDate)) && time(article.pubDate) > time(previous.reviewedAt) }))
  return { complete, includedValue, basis, pricedCount: priced.length, missing, stale, staleFx, asOf: portfolioAsOf(portfolio), findings,
    checkpoint: previous, baselineAsOf: previous ? portfolioAsOf({ ...portfolio, holdings: previous.holdings, fxAsOf: previous.fxAsOf }) : null,
    recordChanges: previous ? recordChanges(portfolio, previous) : [], canCompareWeights, weightChanges, news, newNewsCount: previous ? news.filter(article => article.isNew).length : null }
}
