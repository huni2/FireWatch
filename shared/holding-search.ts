import { catalogQuery, type CatalogPage, type CatalogItem } from './catalog'
import { holdingIdentity } from './holding-registration'

export interface HoldingSearchResult { symbol: string; name: string; instrument?: CatalogItem }
export interface HoldingSearchPage { results: HoldingSearchResult[]; hasMore: boolean; total: number }

// Registration requires metadata; ordinary quote search may return names only.
export async function searchHoldingCatalog(request: <T>(path: string) => Promise<T>, query: string, page = 0): Promise<HoldingSearchPage> {
  const found = await request<CatalogPage>(`/api/catalog?${catalogQuery(query.trim(), '', '', page)}`)
  if (page === 0 && found.total === 0) {
    const external = await request<{ symbol: string; name: string }[]>(`/api/stocks/search?q=${encodeURIComponent(query.trim())}`)
    // The portfolio currently supports Korean and US listings only.
    const results = external.filter(item => /^[A-Za-z0-9]+(?:\.(?:KS|KQ|A|B))?$/i.test(item.symbol))
      .filter((item, index, rows) => rows.findIndex(row => row.symbol.toUpperCase() === item.symbol.toUpperCase()) === index)
    return { results, hasMore: false, total: results.length }
  }
  return { results: found.items.map(({ instrument }) => ({ symbol: instrument.symbol, name: instrument.name, instrument })), hasMore: found.hasMore, total: found.total }
}

export function holdingSearchDescription(result: HoldingSearchResult): string {
  return result.instrument ? holdingIdentity(result.instrument) : `${result.symbol.replace(/\.(KS|KQ)$/i, '')} · 종목 정보 확인 필요`
}
