const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('../web/node_modules/typescript')
const cache = new Map()
function load(file) {
  file = path.resolve(__dirname, '../shared', file)
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }; cache.set(file, module)
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const localRequire = name => name.endsWith('.json') ? JSON.parse(fs.readFileSync(path.resolve(path.dirname(file), name), 'utf8')) : load(path.resolve(path.dirname(file), `${name}.ts`))
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports)
  return module.exports
}
const { portfolioCheckup } = load('portfolio-checkup.ts')
const now = Date.parse('2026-10-14T05:00:00Z')
function row(symbol, value, options = {}) {
  return { holding: { symbol, name: symbol, quantity: 2.5, averageCost: null, currency: 'KRW', assetClass: 'STOCK', sector: '반도체', region: 'KR', underlyingIndex: '', ...options }, valueKrw: value, currentPrice: value == null ? null : value / 2.5, quoteAsOf: '2026-10-14T03:00:00Z', returnPercent: null, investedKrw: null }
}
function portfolio(holdings, options = {}) {
  return { cash: 100, holdings, totalValueKrw: holdings.every(row => row.valueKrw != null) ? 100 + holdings.reduce((sum, row) => sum + row.valueKrw, 0) : null, relatedNews: [], fxAsOf: '2026-10-14', reviewCheckpoint: null, ...options }
}
function checkpoint(p) { return { reviewedAt: '2026-10-13T05:00:00Z', cash: p.cash, holdings: structuredClone(p.holdings), totalValueKrw: p.totalValueKrw, fxAsOf: p.fxAsOf, newsLinks: [] } }

test('펼쳐 볼 수 있도록 모든 점검 항목과 비중 변화를 보존한다', () => {
  const settings = [{ currency: 'USD' }, {}, {}, { assetClass: 'ETF', underlyingIndex: 'S&P 500' }, { assetClass: 'ETF', underlyingIndex: 'S&P 500' }]
  const before = portfolio(settings.map((options, i) => row(`A${i}`, 100, options)))
  const current = portfolio([500, 200, 100, 75, 25].map((value, i) => row(`A${i}`, value, { ...settings[i], quantity: 3 })), { reviewCheckpoint: checkpoint(before) })
  const check = portfolioCheckup(current, now)
  assert.deepEqual(check.findings.map(finding => finding.kind), ['largest', 'index', 'sector', 'currency'])
  assert.equal(check.weightChanges.length, 5)
  assert.equal(check.recordChanges.length, 5)
  assert.equal(before.holdings[0].holding.quantity, 2.5)
})

test('일부 시세가 없으면 확인된 범위의 평가액과 비중만 표시하고 전체 평가로 포장하지 않는다', () => {
  const p = portfolio([row('A', 300), row('B', null)])
  const check = portfolioCheckup(p, now)
  assert.equal(check.complete, false); assert.equal(check.includedValue, 400)
  assert.equal(check.pricedCount, 1); assert.equal(check.missing[0].holding.symbol, 'B')
  assert.match(check.findings[0].title, /75%/); assert.match(check.findings[0].detail, /1\/2개/)
  assert.equal(check.canCompareWeights, false)
})
test('다른 이름의 같은 ETF 지수명을 묶되 주식을 ETF 구성 종목으로 추정하지 않는다', () => {
  const check = portfolioCheckup(portfolio([row('ETF1', null, { assetClass: 'ETF', underlyingIndex: ' S&P 500 ' }), row('ETF2', null, { assetClass: 'ETF', underlyingIndex: 's.p_500' }), row('STOCK', null, { underlyingIndex: 'S&P500' })]), now)
  const finding = check.findings.find(item => item.kind === 'index')
  assert.match(finding.title, /2개/); assert.match(finding.detail, /실제 구성 종목의 중복은 분석하지 않았어요/)
  assert.equal(check.findings.some(item => item.kind === 'largest'), false)
})
test('원화 ETF의 실제 환율 노출과 거래 통화 비중을 혼동하지 않는다', () => {
  const check = portfolioCheckup(portfolio([row('US', 600, { currency: 'USD' }), row('KR ETF', 300, { assetClass: 'ETF' })]), now)
  assert.match(check.findings.find(item => item.kind === 'currency').title, /60%/)
  assert.match(check.findings.find(item => item.kind === 'currency').detail, /해외 ETF의 환율 노출까지 계산한 값은 아니에요/)
  assert.equal(check.staleFx, false)
})
test('지난 점검 뒤 수량 변경과 시세에 따른 비중 차이를 분리하고 소수점 수량을 보존한다', () => {
  const old = portfolio([row('A', 200, { quantity: 0.125 })])
  const current = portfolio([row('A', 400, { quantity: 0.1875, averageCost: 20 })], { reviewCheckpoint: checkpoint(old) })
  const check = portfolioCheckup(current, now)
  assert.equal(check.canCompareWeights, true)
  assert.match(check.recordChanges[0], /0\.125주 → 0\.1875주/)
  assert.match(check.recordChanges[0], /평균 구매 가격 수정/)
  assert(Math.abs(check.weightChanges[0].difference - (80 - 200 / 300 * 100)) < 0.0001)
  assert.equal(old.holdings[0].holding.quantity, 0.125)
})
test('어느 점검이든 시세가 빠지면 이전 누락 자산을 0원으로 바꿔 비중 변화율을 만들지 않는다', () => {
  const old = portfolio([row('A', null)])
  const current = portfolio([row('A', 200, { quantity: 3 })], { reviewCheckpoint: checkpoint(old) })
  const check = portfolioCheckup(current, now)
  assert.equal(check.canCompareWeights, false); assert.deepEqual(check.weightChanges, [])
  assert.equal(check.recordChanges.length, 1)
})
test('종목 추가 삭제와 현금 수정은 매매 체결이나 수익으로 표현하지 않는다', () => {
  const old = portfolio([row('A', 200)])
  const current = portfolio([row('B', 300)], { cash: 200, totalValueKrw: 500, reviewCheckpoint: checkpoint(old) })
  const check = portfolioCheckup(current, now)
  assert(check.recordChanges.includes('B 보유 기록 추가')); assert(check.recordChanges.includes('A 보유 기록 삭제'))
  assert(check.recordChanges.includes('현금 100원 → 200원'))
  assert(check.weightChanges.some(item => item.symbol === 'A' && item.after === 0))
})
test('낡거나 미래인 시세 날짜와 누락 환율 날짜를 정상 최신 자료로 표시하지 않는다', () => {
  const old = { ...row('OLD', 100), quoteAsOf: '2026-10-01T05:00:00Z' }
  const future = { ...row('FUTURE', 100, { currency: 'USD' }), quoteAsOf: '2026-10-15T05:00:00Z' }
  const check = portfolioCheckup(portfolio([old, future], { fxAsOf: null }), now)
  assert.equal(check.stale.length, 2); assert.equal(check.staleFx, true)
})
test('발행일과 이전 링크가 확인된 자료만 새 소식으로 세고 미래·위험 링크·중복은 제외한다', () => {
  const old = portfolio([row('A', 100)])
  const previous = checkpoint(old); previous.newsLinks = ['https://example.com/seen']
  const article = (link, pubDate) => ({ link, pubDate, title: '보유 종목 자료', description: null })
  const p = portfolio(old.holdings, { reviewCheckpoint: previous, relatedNews: [
    article('https://example.com/new', '2026-10-14T01:00:00Z'), article('https://example.com/new', '2026-10-14T01:00:00Z'),
    article('https://example.com/seen', '2026-10-14T01:00:00Z'), article('https://example.com/old', '2026-10-01T01:00:00Z'),
    article('https://example.com/unknown', null), article('https://example.com/future', '2026-10-15T01:00:00Z'), article('javascript:alert(1)', '2026-10-14T01:00:00Z'),
  ] })
  const check = portfolioCheckup(p, now)
  assert.equal(check.newNewsCount, 1); assert.equal(check.news.length, 4)
  assert.equal(check.news.find(article => article.link.endsWith('/unknown')).isNew, false)
  assert.equal(portfolioCheckup(portfolio(old.holdings), now).newNewsCount, null)
})
