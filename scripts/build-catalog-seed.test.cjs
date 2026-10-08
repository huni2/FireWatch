// 카탈로그 원본의 확인일·중복·불완전 자료와 시세 혼입을 검증한다.
const test = require('node:test')
const assert = require('node:assert/strict')
const { buildCatalog } = require('./build-catalog-seed.cjs')
const company = { symbol: '035720.KS', name: '카카오', aliases: ['Kakao'], sectorId: 'software', region: 'KR', description: '플랫폼 기업', source: 'https://www.kakaocorp.com/ir/main' }
const etf = { ...company, symbol: 'VOO', region: 'US', underlyingIndex: 'S&P 500', issuer: 'Vanguard' }
test('새 기업 확인일을 적용하고 기존 기업과 ETF 확인일은 보존한다', () => {
  const rows = buildCatalog([company, { ...company, symbol: 'AMD', region: 'US', verifiedAt: '2026-10-09' }], [etf], '2026-10-07', '2026-10-07')
  assert.deepEqual(rows.map(row => row.verifiedAt), ['2026-10-07', '2026-10-09', '2026-10-07'])
  assert.deepEqual(rows.map(row => row.currency), ['KRW', 'USD', 'USD'])
})
test('중복과 잘못된 식별자·상장 국가를 거절한다', () => {
  assert.throws(() => buildCatalog([company, company], [], '2026-10-07'))
  for (const changes of [{ symbol: '잘못된 코드' }, { region: 'US' }, { symbol: 'BAD' }]) assert.throws(() => buildCatalog([{ ...company, ...changes }], [], '2026-10-07'))
})
test('누락된 별칭/필드·잘못된 출처/날짜·추정 시세는 거절한다', () => {
  for (const changes of [{ name: '' }, { aliases: [''] }, { source: 'http://example.com' }, { source: 'https://user:pass@example.com' }, { verifiedAt: '2026-02-30' }, { verifiedAt: 'invalid' }, { price: 0 }]) assert.throws(() => buildCatalog([{ ...company, ...changes }], [], '2026-10-07'))
  assert.throws(() => buildCatalog([], [{ ...etf, issuer: '' }], '2026-10-07', '2026-10-07'))
})
