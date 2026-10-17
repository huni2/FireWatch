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
const { selectedHolding, holdingError, holdingIdentity } = load('holding-registration.ts')
const { emptyHolding } = load('investing.ts')
const { searchHoldingCatalog, holdingSearchDescription } = load('holding-search.ts')
const instrument = { symbol: 'NEWETF', name: '서버에만 있는 ETF', assetClass: 'ETF', currency: 'USD', region: 'US', sectorId: 'software', underlyingIndex: 'TEST INDEX' }

test('클라이언트 목록 밖 ETF도 서버 메타데이터로 등록하고 다른 종목의 수량과 가격은 가져오지 않는다', () => {
  const before = { ...emptyHolding(), symbol: '005930.KS', quantity: 10, averageCost: 70000 }
  const selected = selectedHolding(before, instrument.symbol, '이전 이름', instrument)
  assert.equal(selected.name, instrument.name)
  assert.equal(selected.assetClass, 'ETF'); assert.equal(selected.currency, 'USD')
  assert.equal(selected.underlyingIndex, 'TEST INDEX'); assert.equal(selected.sector, '플랫폼·소프트웨어')
  assert.equal(selected.quantity, 0); assert.equal(selected.averageCost, null)
  assert.equal(holdingError({ ...selected, quantity: 0.125 }, []), null)
  assert.equal(before.quantity, 10); assert.equal(before.averageCost, 70000)
})
test('같은 종목의 정보를 보완할 때 입력한 수량과 평균 구매 가격을 보존한다', () => {
  const before = { ...emptyHolding(), symbol: 'NEWETF', quantity: 3.5, averageCost: 12.25 }
  const selected = selectedHolding(before, 'NEWETF', '', instrument)
  assert.equal(selected.quantity, 3.5); assert.equal(selected.averageCost, 12.25)
  assert.match(holdingIdentity({ ...selected, symbol: '123456.KS', currency: 'KRW' }), /한국 상장 · ETF · 원화/)
})
test('평균 구매 가격은 선택 입력이며 중복과 잘못된 소수점 수량은 차단한다', () => {
  const holding = { ...selectedHolding(emptyHolding(), 'NEWETF', '', instrument), quantity: 1, averageCost: null }
  assert.equal(holdingError(holding, []), null)
  assert.match(holdingError(holding, [{ ...holding, symbol: 'newetf' }]), /이미 등록/)
  assert.match(holdingError({ ...holding, quantity: 0.00001 }, []), /수량/)
  assert.match(holdingError({ ...holding, averageCost: -1 }, []), /매입가/)
})
test('검색어와 페이지를 인코딩하고 결과의 메타데이터 및 다음 페이지 여부를 전달한다', async () => {
  const calls = []
  const found = await searchHoldingCatalog(async url => { calls.push(url); return { items: [{ instrument }], total: 51, hasMore: true } }, ' S&P 500 ', 1)
  const url = new URL(calls[0], 'http://localhost')
  assert.equal(url.searchParams.get('q'), 'S&P 500'); assert.equal(url.searchParams.get('page'), '1')
  assert.equal(found.results[0].instrument, instrument); assert.equal(found.hasMore, true); assert.equal(found.total, 51)
})
test('카탈로그에 없는 결과는 확인 필요로 표시하고 지원하지 않는 상장시장과 중복을 제외한다', async () => {
  const found = await searchHoldingCatalog(async url => url.startsWith('/api/catalog') ? { items: [], total: 0, hasMore: false } : [
    { symbol: 'UNKNOWN', name: '새 종목' }, { symbol: 'UNKNOWN', name: '중복' }, { symbol: 'OTHER.L', name: '영국' }, { symbol: 'BRK.B', name: '미국 클래스 B' },
  ], '새 종목')
  assert.deepEqual(found.results.map(item => item.symbol), ['UNKNOWN', 'BRK.B'])
  assert.equal(found.results[0].instrument, undefined)
  assert.match(holdingSearchDescription(found.results[0]), /종목 정보 확인 필요/)
})
test('검색 통신 실패를 빈 결과로 숨기지 않는다', async () => {
  await assert.rejects(searchHoldingCatalog(async () => { throw new Error('offline') }, '삼성'), /offline/)
})
