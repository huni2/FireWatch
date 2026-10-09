export interface CatalogItem {
  symbol: string; name: string; aliases: string[]; sectorId: string; region: 'KR' | 'US'; description: string
  source: string; underlyingIndex: string; issuer: string; assetClass: 'STOCK' | 'ETF'; currency: 'KRW' | 'USD'; verifiedAt: string
}
export interface CatalogPage { items: { instrument: CatalogItem; price: number | null; quoteAt: string | null }[]; total: number; hasMore: boolean }
export const catalogQuery = (q = '', assetClass = '', region = '', page = 0) => new URLSearchParams({ q, assetClass, region, page: String(page) }).toString()
