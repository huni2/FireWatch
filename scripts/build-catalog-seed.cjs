// 공식 출처와 확인일을 검증해 기업·ETF 카탈로그 시드를 생성한다.
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
function buildCatalog(companies, etfs, companyDate, etfDate) {
  const symbols = new Set()
  const rows = [...companies.map(row => ({ ...row, assetClass: 'STOCK', underlyingIndex: '', issuer: '', verifiedAt: row.verifiedAt ?? companyDate })), ...etfs.map(row => ({ ...row, assetClass: 'ETF', verifiedAt: row.verifiedAt ?? etfDate }))]
    .map(row => ({ ...row, currency: row.region === 'KR' ? 'KRW' : 'USD' }))
  for (const row of rows) {
    if (!/^(?:[0-9]{6}\.K[QS]|[A-Z][A-Z0-9.-]{0,19})$/.test(row.symbol) || symbols.has(row.symbol)) throw Error('종목 식별자가 잘못되었거나 중복됩니다.')
    symbols.add(row.symbol)
    if (!['KR', 'US'].includes(row.region) || (row.region === 'KR') !== /\.K[QS]$/.test(row.symbol)) throw Error('상장 국가와 종목 식별자를 확인해주세요.')
    if (![row.name, row.description, row.sectorId].every(value => typeof value === 'string' && value.trim())) throw Error('기업 이름·설명·분야가 필요합니다.')
    if (!Array.isArray(row.aliases) || row.aliases.some(value => typeof value !== 'string' || !value.trim())) throw Error('검색 별칭을 확인해주세요.')
    const url = new URL(row.source)
    if (url.protocol !== 'https:' || url.username || url.password) throw Error('공식 HTTPS 출처가 필요합니다.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.verifiedAt) || new Date(row.verifiedAt).toISOString().slice(0, 10) !== row.verifiedAt) throw Error('실제 확인 날짜가 필요합니다.')
    if (row.assetClass === 'ETF' && (!row.underlyingIndex.trim() || !row.issuer.trim())) throw Error('ETF 지수와 운용사가 필요합니다.')
    if (['price', 'fee', 'returnPercent'].some(key => key in row)) throw Error('가격·보수·성과는 메타데이터 시드에 넣지 않습니다.')
  }
  return rows
}

function generate() {
  const source = fs.readFileSync(path.join(root, 'shared/discovery.ts'), 'utf8')
  const literal = source.match(/export const companies: Company\[\] = (\[[\s\S]*?\n\])/)[1]
  const companies = Function(`"use strict"; return (${literal})`)()
  const companyDate = source.match(/export const companyDefaultVerifiedAt = '([^']+)'/)[1]
  const etfs = JSON.parse(fs.readFileSync(path.join(root, 'shared/etfs.json'), 'utf8'))
  const rows = buildCatalog(companies, etfs, companyDate, '2026-10-07')
  fs.writeFileSync(path.join(root, 'backend/src/main/resources/catalog-seed.json'), JSON.stringify(rows, null, 2) + '\n')
  console.log(`Catalog seed: ${rows.length} source-linked entries`)
}
module.exports = { buildCatalog, generate }
if (require.main === module) generate()
