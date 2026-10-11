// 투자 연결의 실제 등록 근거와 웹·Android 날짜 검증 경계를 확인한다.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('../web/node_modules/typescript')
function load(name) {
  const source = fs.readFileSync(path.join(__dirname, '../shared', name), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const value = { exports: {} }; new Function('exports', 'module', code)(value.exports, value)
  return value.exports
}
const { portfolioConnections } = load('portfolio-connections.ts')
const { newsDateRangeError } = load('news-date-range.ts')
const row = (symbol, name, assetClass, sector, currency = 'KRW', underlyingIndex = '') => ({ holding: { symbol, name, assetClass, sector, currency, underlyingIndex } })
const holdings = [row('A', '기업 A', 'STOCK', '반도체'), row('B', 'ETF B', 'ETF', '미분류', 'KRW', ' S&P 500 '), row('C', 'ETF C', 'ETF', '미분류', 'USD', 'S&P 500'), row('D', 'ETF D', 'ETF', '', 'KRW', '')]
test('등록 분류는 유지하고 서버 비중이 없으면 계산값을 만들지 않는다', () => {
  const groups = portfolioConnections({ holdings }, 'sector')
  assert.equal(groups.find(group => group.key === '미분류').names.length, 2)
  assert.equal(groups.find(group => group.key === '미입력').names[0], 'ETF D')
  assert(groups.every(group => group.weight === null))
})
test('서버가 계산한 해당 분야·거래 통화 비중만 표시한다', () => {
  const portfolio = { holdings, exposure: { sectorWeights: { 반도체: 31.2 }, tradingCurrencyWeights: { USD: 22.1 } } }
  assert.equal(portfolioConnections(portfolio, 'sector').find(group => group.key === '반도체').weight, 31.2)
  assert.equal(portfolioConnections(portfolio, 'currency').find(group => group.key === 'USD').weight, 22.1)
  assert.equal(portfolioConnections(portfolio, 'currency').find(group => group.key === 'KRW').weight, null)
})
test('ETF 입력 지수명만 연결하고 개별 주식을 지수 구성으로 추정하지 않는다', () => {
  const groups = portfolioConnections({ holdings }, 'index')
  assert.deepEqual(groups.find(group => group.key === 'S&P 500').symbols, ['B', 'C'])
  assert(groups.every(group => !group.symbols.includes('A') && group.weight === null))
  assert.equal(groups.find(group => group.key === '미입력').names[0], 'ETF D')
  assert.deepEqual(portfolioConnections({ holdings: [holdings[0]] }, 'index'), [])
})
test('빈 날짜·열린 기간·윤년·같은 날짜는 유효하다', () => {
  for (const [from, to] of [['', ''], ['2024-02-29', ''], ['', '2026-10-11'], ['2026-10-11', '2026-10-11']]) assert.equal(newsDateRangeError(from, to), '')
})
test('역전된 기간·존재하지 않는 날짜·자유 형식을 거절한다', () => {
  for (const [from, to] of [['2026-10-12', '2026-10-11'], ['2026-02-29', ''], ['2026-02-30', ''], ['2026-13-01', ''], ['26/10/11', '']]) assert(newsDateRangeError(from, to))
})
