// 운영 게임 검증의 명시적 실행·실패 중단·격리된 전체 요청 흐름을 로컬에서 검사한다.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { verifyGame } = require('./verify-game-live.cjs')

function reportFile(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firewatch-game-check-'))
  const reportPath = path.join(dir, 'report.json')
  t.after(() => {
    for (const file of [reportPath, `${reportPath}.private.json`]) if (fs.existsSync(file)) fs.unlinkSync(file)
    fs.rmdirSync(dir)
  })
  return reportPath
}
function mockFetch(t, handler) {
  const original = global.fetch
  global.fetch = handler
  t.after(() => { global.fetch = original })
}

test('쓰기 명시 없이 네트워크/파일에 접근하지 않는다', async t => {
  mockFetch(t, () => { assert.fail('네트워크 접근') })
  const reportPath = reportFile(t)
  await assert.rejects(verifyGame({ baseUrl: 'https://example.com', reportPath }), /명시/)
  assert.equal(fs.existsSync(reportPath), false)
})

test('첫 서버 실패를 반복하지 않고 부분 보고서를 보존한다', async t => {
  const reportPath = reportFile(t)
  let calls = 0
  mockFetch(t, async () => { calls++; return new Response('{}', { status: 503 }) })
  await assert.rejects(verifyGame({ baseUrl: 'https://example.com', reportPath, writeIsolatedGame: true, pauseMs: 0 }), /503/)
  assert.equal(calls, 1)
  const report = JSON.parse(fs.readFileSync(reportPath))
  assert.equal(report.status, 'FAIL')
  assert.equal(report.observations.length, 1)
  assert.equal(report.observations[0].applicationMs, null)
  assert.equal(report.deviceId, undefined)
})

test('한 격리 게임의24턴/멱등 주문/조회 경계/종료 보존만 요청한다', async t => {
  const reportPath = reportFile(t)
  let turnIndex = 0
  let ended = false
  let quantity = 0
  let owner
  const transactions = []
  const requests = []
  const companies = Array.from({ length: 26 }, (_, index) => ({ symbol: `S${index}`, name: `기업${index}`, sector: '분야', source: 'https://example.com/company', verifiedAt: '2026-10-09' }))
  const history = (symbol, points) => ({ instrumentType: 'STOCK', symbol, name: '기업0', points: Array.from({ length: points }, (_, i) => ({ turnIndex: i, price: 100 })) })
  const snapshot = compact => ({ sessionId: 1, simulation: true, simulationVersion: 2, totalTurns: 24, turnIndex,
    status: ended ? 'ENDED' : 'ACTIVE', gameAssets: companies, stockPrices: Object.fromEntries(companies.map(company => [company.symbol, 100])),
    marketEvents: [], assetHistories: Array.from({ length: 34 }, (_, i) => history(`S${i}`, compact ? Math.min(2, turnIndex + 1) : turnIndex + 1)),
    gamePicks: [{ symbol: 'S0', reason: '관찰 이유', risk: '위험', newsTitle: '[가상 뉴스] 시험' }], transactions: structuredClone(transactions),
    cash: 10000 - quantity * 100, portfolioValue: 10000,
    holdings: quantity ? [{ symbol: 'S0', quantity, currentPrice: 100, value: quantity * 100 }] : [] })
  mockFetch(t, async (address, options) => {
    const url = new URL(address)
    const body = options.body && JSON.parse(options.body)
    requests.push({ path: url.pathname, device: options.headers['X-Device-Id'], method: options.method })
    let status = 200
    let result
    if (url.pathname.endsWith('/start')) owner = options.headers['X-Device-Id']
    if (url.pathname.endsWith('/trade') && !transactions.some(tx => tx.requestId === body.requestId)) {
      transactions.push({ ...body, id: transactions.length + 1 })
      quantity += body.action === 'BUY' ? body.quantity : -body.quantity
    }
    if (url.pathname.endsWith('/next-turn')) { assert.equal(body.expectedTurnIndex, turnIndex); turnIndex++ }
    if (url.pathname.endsWith('/end')) ended = true
    if (url.pathname.endsWith('/history')) {
      if (options.headers['X-Device-Id'] !== owner) status = 404
      else if (Number(url.searchParams.get('turnIndex')) > turnIndex) status = 400
      result = { sessionId: 1, turnIndex: 23, history: history('S0', 24) }
    } else result = snapshot(url.searchParams.get('compact') === 'true')
    return new Response(JSON.stringify(result), { status, headers: { 'Server-Timing': 'cdn;dur=2, application;dur=12.5' } })
  })
  const report = await verifyGame({ baseUrl: 'https://example.com', reportPath, writeIsolatedGame: true, pauseMs: 0 })
  assert.equal(report.status, 'PASS')
  assert.equal(report.observations.length, 43)
  for (const sample of report.observations) {
    assert.equal(sample.applicationMs, 12.5)
    assert.ok(Number.isFinite(Date.parse(sample.startedAt)))
    assert.ok(sample.headersMs >= 0 && sample.bodyReadMs >= 0)
    assert.ok(Math.abs(sample.elapsedMs - sample.headersMs - sample.bodyReadMs) <= 0.2)
  }
  assert.equal(JSON.stringify(report).includes('cdn;dur'), false)
  assert.equal(requests.filter(request => request.path.endsWith('/start')).length, 1)
  assert.equal(requests.filter(request => request.path.endsWith('/next-turn')).length, 23)
  assert.ok(requests.every(request => !request.path.includes('rank') && request.method !== 'DELETE'))
  assert.match(owner, /^game-check-[a-f0-9-]+$/)
  assert.equal(report.deviceId, undefined)
  assert.equal(JSON.stringify(report).includes(owner), false)
  assert.equal(JSON.parse(fs.readFileSync(`${reportPath}.private.json`)).deviceId, owner)
  assert.equal(ended, true)
  assert.equal(quantity, 1)
})

for (const header of ['application;dur=-1', 'application;dur=NaN', 'application;dur=Infinity', 'application;dur=1e309', 'other;dur=12;desc="private-token"']) {
  test(`잘못된 Server-Timing 값은 원문 없이 null로 보관한다 (${header.split(';')[0]})`, async t => {
    const reportPath = reportFile(t)
    mockFetch(t, async () => new Response('{}', { status: 503, headers: { 'Server-Timing': header } }))
    await assert.rejects(verifyGame({ baseUrl: 'https://example.com', reportPath, writeIsolatedGame: true, pauseMs: 0 }), /503/)
    const report = JSON.parse(fs.readFileSync(reportPath))
    assert.equal(report.observations[0].applicationMs, null)
    assert.equal(JSON.stringify(report).includes(header), false)
    assert.equal(JSON.stringify(report).includes('private-token'), false)
  })
}
