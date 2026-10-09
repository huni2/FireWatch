// 격리된 시험 게임 한 판의 운영 계약과 HTTP 관측 시간을 제한된 요청으로 확인한다.
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs')

async function verifyGame({ baseUrl, reportPath, writeIsolatedGame, pauseMs = 100 }) {
  assert.equal(writeIsolatedGame, true, '--write-isolated-game 명시가 필요합니다.')
  const url = new URL(baseUrl)
  assert.ok(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
  assert.equal(url.username + url.password + url.search + url.hash, '', '주소에 자격증명/검색 조건을 넣을 수 없습니다.')
  assert.equal(url.pathname, '/', 'API 서버 원본 주소를 사용해주세요.')
  const report = { startedAt: new Date().toISOString(), baseUrl: url.origin, status: 'RUNNING', observations: [], checks: [] }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { flag: 'wx' })
  const deviceId = `game-check-${randomUUID()}`
  // 이 파일은 기기 소유 권한을 담으므로 보고서/PR에 게시하지 않는다.
  const privatePath = `${reportPath}.private.json`
  fs.writeFileSync(privatePath, JSON.stringify({ deviceId }, null, 2), { flag: 'wx' })
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  async function request(label, path, { body, expectedStatus = 200, device = deviceId } = {}) {
    assert.ok(report.observations.length < 60, '요청 한도60회 초과')
    if (pauseMs > 0) await new Promise(resolve => setTimeout(resolve, pauseMs))
    const started = performance.now()
    const response = await fetch(`${url.origin}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'X-Device-Id': device, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    })
    const text = await response.text()
    report.observations.push({ label, method: body === undefined ? 'GET' : 'POST', status: response.status,
      elapsedMs: Math.round((performance.now() - started) * 10) / 10, decodedJsonBytes: Buffer.byteLength(text) })
    save()
    assert.equal(response.status, expectedStatus, `${label}: 예상 HTTP ${expectedStatus}, 실제 ${response.status}`)
    return JSON.parse(text)
  }
  function checkTurn(turn) {
    assert.equal(turn.simulation, true)
    assert.equal(turn.simulationVersion, 2)
    assert.equal(turn.totalTurns, 24)
    assert.equal(turn.gameAssets.length, 26)
    assert.equal(new Set(turn.gameAssets.map(asset => asset.symbol)).size, 26)
    assert.ok(turn.gameAssets.every(asset => asset.name && asset.sector && asset.source && asset.verifiedAt))
    assert.equal(Object.keys(turn.stockPrices).length, 26)
    assert.ok(Object.values(turn.stockPrices).every(price => price > 0))
    assert.equal(turn.assetHistories.length, 34)
    assert.ok(turn.assetHistories.every(history => history.points.length === Math.min(2, turn.turnIndex + 1)))
    assert.ok(turn.gamePicks.length > 0)
    assert.ok(turn.gamePicks.every(pick => turn.stockPrices[pick.symbol] > 0 && pick.reason && pick.risk && pick.newsTitle.includes('가상')))
    assert.ok(turn.portfolioValue > 0)
    const value = turn.cash + turn.holdings.reduce((sum, holding) => {
      assert.ok(holding.currentPrice > 0 && holding.value > 0)
      assert.ok(Math.abs(holding.quantity * holding.currentPrice - holding.value) < 0.02)
      return sum + holding.value
    }, 0)
    assert.ok(Math.abs(value - turn.portfolioValue) < 0.02, '현금+보유 평가 합계 불일치')
  }
  try {
    let turn = await request('start', '/api/game/start?compact=true', { body: { difficulty: 'NORMAL', allowShortSelling: false } })
    report.sessionId = turn.sessionId
    fs.writeFileSync(privatePath, JSON.stringify({ deviceId, sessionId: turn.sessionId }, null, 2))
    checkTurn(turn)
    assert.equal(turn.turnIndex, 0)
    assert.equal(turn.transactions.length, 0)
    const blocked = turn.marketEvents.flatMap(event => event.blockedAssets)
    const pick = turn.gamePicks.find(item => !blocked.includes(`STOCK:${item.symbol}`) && turn.stockPrices[item.symbol] * 2 < turn.cash)
    assert.ok(pick, '이 턴에 시험 주문 가능한 픽이 없습니다. 자동 재시도하지 않습니다.')
    report.companies = turn.gameAssets.map(({ name, symbol, sector, source, verifiedAt }) => ({ name, symbol, sector, source, verifiedAt }))
    const order = { instrumentType: 'STOCK', symbol: pick.symbol, action: 'BUY', quantity: 2,
      requestId: randomUUID(), expectedTurnIndex: turn.turnIndex, expectedPrice: turn.stockPrices[pick.symbol] }
    await request('preview', '/api/game/preview', { body: order })
    turn = await request('buy', '/api/game/trade?compact=true', { body: order })
    checkTurn(turn)
    assert.equal(turn.transactions.length, 1)
    assert.equal(turn.holdings.find(holding => holding.symbol === pick.symbol).quantity, 2)
    const repeated = await request('buy-idempotent', '/api/game/trade?compact=true', { body: order })
    assert.deepEqual(repeated.transactions, turn.transactions)
    assert.equal(repeated.cash, turn.cash)
    turn = await request('sell', '/api/game/trade?compact=true', { body: { ...order, action: 'SELL', quantity: 1, requestId: randomUUID() } })
    checkTurn(turn)
    assert.equal(turn.transactions.length, 2)
    assert.equal(turn.holdings.find(holding => holding.symbol === pick.symbol).quantity, 1)
    report.checks.push('26기업/출처/가상 픽·직접 매수/매도/멱등 체결')
    const ledger = turn.transactions
    while (turn.turnIndex < 23) {
      const previous = turn
      turn = await request('next-turn', '/api/game/next-turn?compact=true', { body: { expectedTurnIndex: turn.turnIndex } })
      assert.equal(turn.turnIndex, previous.turnIndex + 1)
      assert.equal(turn.sessionId, report.sessionId)
      assert.deepEqual(turn.transactions, ledger)
      checkTurn(turn)
    }
    for (let i = 0; i < 5; i++) {
      const compact = await request('current-compact', '/api/game/current?compact=true')
      const full = await request('current-full', '/api/game/current')
      checkTurn(compact)
      // 브리핑 생성 시각 외 장부·가격·평가·픽은 두 계약에서 같다.
      for (const key of ['sessionId', 'turnIndex', 'holdings', 'cash', 'portfolioValue', 'transactions', 'stockPrices', 'gamePicks']) {
        assert.deepEqual(compact[key], full[key], `compact/full ${key}`)
      }
      assert.ok(full.assetHistories.every(history => history.points.length === 24))
    }
    const path = `/api/game/sessions/${turn.sessionId}/assets/history?turnIndex=23&instrumentType=STOCK&symbol=${encodeURIComponent(pick.symbol)}`
    const history = await request('history', path)
    assert.equal(history.sessionId, turn.sessionId)
    assert.equal(history.turnIndex, 23)
    assert.equal(history.history.symbol, pick.symbol)
    assert.equal(history.history.points.length, 24)
    assert.equal(history.history.points.at(-1).price, turn.stockPrices[pick.symbol])
    await request('future-rejected', path.replace('turnIndex=23', 'turnIndex=24'), { expectedStatus: 400 })
    await request('other-device-rejected', path, { expectedStatus: 404, device: `game-check-${randomUUID()}` })
    report.checks.push('24턴 compact/전체 계약·선택 그래프/미래 턴/타기기 차단')
    const ended = await request('end', '/api/game/end?compact=true', { body: {} })
    assert.equal(ended.status, 'ENDED')
    assert.deepEqual(ended.transactions, ledger)
    assert.deepEqual((await request('ended-history', path)).history, history.history)
    report.checks.push('종료 후 원장·상세 보존/순위 요청 없음')
    report.status = 'PASS'
  } catch (error) {
    report.status = 'FAIL'
    report.failure = error.message
    throw error
  } finally {
    report.finishedAt = new Date().toISOString()
    report.timings = [...new Set(report.observations.map(item => item.label))].map(label => {
      const samples = report.observations.filter(item => item.label === label)
      const times = samples.map(item => item.elapsedMs).sort((a, b) => a - b)
      const mid = Math.floor(times.length / 2)
      return { label, count: times.length, medianMs: Math.round((times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2) * 10) / 10,
        minMs: times[0], maxMs: times.at(-1), minDecodedJsonBytes: Math.min(...samples.map(item => item.decodedJsonBytes)), maxDecodedJsonBytes: Math.max(...samples.map(item => item.decodedJsonBytes)) }
    })
    save()
  }
  return report
}

module.exports = { verifyGame }
if (require.main === module) {
  const args = process.argv.slice(2)
  const options = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--write-isolated-game') options.writeIsolatedGame = true
    else if (args[i] === '--base-url') options.baseUrl = args[++i]
    else if (args[i] === '--report') options.reportPath = args[++i]
    else throw new Error(`알 수 없는 옵션: ${args[i]}`)
  }
  verifyGame(options).then(report => console.log(JSON.stringify({ status: report.status, sessionId: report.sessionId, checks: report.checks, timings: report.timings }, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1 })
}
