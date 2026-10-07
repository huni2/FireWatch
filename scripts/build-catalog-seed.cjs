// Curated, source-linked metadata only. No live prices/fees or inferred suitability.
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'shared/discovery.ts'), 'utf8')
const literal = source.match(/export const companies: Company\[\] = (\[[\s\S]*?\n\])/)[1]
const companies = Function(`"use strict"; return (${literal})`)()
const etfs = JSON.parse(fs.readFileSync(path.join(root, 'shared/etfs.json'), 'utf8'))
const rows = [...companies.map(row => ({ ...row, assetClass: 'STOCK', underlyingIndex: '', issuer: '' })), ...etfs.map(row => ({ ...row, assetClass: 'ETF' }))]
  .map(row => ({ ...row, currency: row.region === 'KR' ? 'KRW' : 'USD', verifiedAt: '2026-10-07' }))
fs.writeFileSync(path.join(root, 'backend/src/main/resources/catalog-seed.json'), JSON.stringify(rows, null, 2) + '\n')
console.log(`Catalog seed: ${rows.length} source-linked entries`)
