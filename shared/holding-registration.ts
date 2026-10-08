// 회사 선택과 단일 자산 등록 검증을 웹과 Android에서 공유한다.
import { companies, sectors } from './discovery'
import etfs from './etfs.json'
import type { Holding } from './investing'

export function selectedHolding(current: Holding, symbol: string, name?: string): Holding {
  const company = companies.find(item => item.symbol === symbol)
  const etf = etfs.find(item => item.symbol === symbol)
  const korean = /\.(KS|KQ)$/.test(symbol)
  return { ...current, symbol, name: name || company?.name || etf?.name || '', assetClass: etf ? 'ETF' : 'STOCK', currency: korean ? 'KRW' : 'USD', region: korean ? 'KR' : 'US', sector: sectors.find(item => item.id === company?.sectorId)?.name || '미분류', underlyingIndex: etf?.underlyingIndex ?? '' }
}

export function holdingError(holding: Holding, others: Holding[]): string | null {
  if (!holding.symbol || !holding.name.trim()) return '회사나 상품을 먼저 선택해주세요.'
  if (!Number.isFinite(holding.quantity) || holding.quantity <= 0 || holding.quantity > 1e9 || !/^\d+(\.\d{1,4})?$/.test(String(holding.quantity))) return '수량은 0보다 크게, 소수점 네 자리까지 입력해주세요.'
  if (holding.averageCost != null && (!Number.isFinite(holding.averageCost) || holding.averageCost <= 0 || holding.averageCost > 1e9 || !/^\d+(\.\d{1,4})?$/.test(String(holding.averageCost)))) return '매입가를 입력한다면 0보다 크게, 소수점 네 자리까지 입력해주세요.'
  if (others.some(item => item.symbol.toUpperCase() === holding.symbol.toUpperCase())) return '이미 등록한 자산이에요. 보유 목록에서 수량을 수정해주세요.'
  return null
}

export function portfolioCoverageText(portfolio: import('./investing').Portfolio): string {
  const coverage = portfolio.valuationCoverage
  if (!coverage) return '현금 포함 매입원금 기준 · 저장된 분석'
  return coverage.pricedHoldings === coverage.totalHoldings ? '등록한 자산과 현금의 수집 시세 기준이에요.' : `${coverage.totalHoldings}개 중 ${coverage.pricedHoldings}개 자산과 현금으로 비중을 계산했어요. 제외된 자산: ${coverage.missingNames.join(' · ')}`
}

export function portfolioFinding(portfolio: import('./investing').Portfolio): string {
  const overlap = portfolio.exposure?.indexOverlaps[0]
  if (overlap) return `${overlap.names.join(' · ')}가 같은 지수를 따라가요.`
  const coverage = portfolio.valuationCoverage
  if (coverage && coverage.pricedHoldings < coverage.totalHoldings) return `${coverage.totalHoldings - coverage.pricedHoldings}개 자산은 가격·환율 확인이 필요해요. 계산된 범위를 확인해주세요.`
  const largest = portfolio.exposure?.largestHoldings[0]
  if (largest && portfolio.holdings.length > 1) return `평가 가능한 등록 자산과 현금에서 ${largest.name} 비중이 ${largest.weightPercent}%예요.`
  if (portfolio.holdings.length === 1) return `${portfolio.holdings[0].holding.name} 보유 기록을 추가했어요. 다른 보유 자산도 추가하면 구성을 비교할 수 있어요.`
  return portfolio.holdings.length ? '등록한 자산의 비중과 겹치는 투자를 확인해보세요.' : '등록한 현금과 보유 자산을 함께 점검할 수 있어요.'
}
