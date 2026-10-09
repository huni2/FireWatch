// KRX 공식 법인 표에서 검색용 최소 메타데이터만 검증하고 카탈로그를 생성한다.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const markets = { stockMkt: { label: '유가', suffix: 'KS', minimum: 500 }, kosdaqMkt: { label: '코스닥', suffix: 'KQ', minimum: 1000 } }
const sourceUrl = market => `https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&marketType=${market}`
function cellText(value) {
  return value.replace(/<[^>]*>/g, '').replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g, entity => ({ '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' })[entity])
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/\s+/g, ' ').trim()
}
function parseKrxHtml(bytes, market) {
  assert.ok(markets[market], '지원하지 않는 시장입니다.')
  const html = new TextDecoder('euc-kr').decode(bytes)
  const rows = []
  let header = false
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(row => cellText(row[1]))
    if (!cells.length) continue
    if (/<th\b/i.test(match[1])) {
      assert.deepEqual(cells.slice(0, 4), ['회사명', '시장구분', '종목코드', '업종'], '공식 표의 열을 확인해주세요.')
      assert.equal(header, false, '중복된 표 머리글입니다.')
      header = true
      continue
    }
    assert.ok(header && cells.length === 10, '불완전한 공식 표입니다.')
    assert.ok(cells.slice(0, 4).every(value => !value.includes('\uFFFD')), '저장할 한글 필드를 손상 없이 읽을 수 없습니다.')
    assert.equal(cells[1], markets[market].label, '시장구분이 일치하지 않습니다.')
    rows.push({ name: cells[0], code: cells[2], industry: cells[3], market })
  }
  assert.ok(header && rows.length, '상장법인 자료가 없습니다.')
  return rows
}
function buildDirectory(snapshot) {
  assert.equal(snapshot.schemaVersion, 1)
  assert.match(snapshot.verifiedAt, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(new Date(snapshot.verifiedAt).toISOString().slice(0, 10), snapshot.verifiedAt, '실제 달력 날짜가 필요합니다.')
  assert.ok(Array.isArray(snapshot.companies) && snapshot.companies.length <= 20000)
  assert.equal(snapshot.sources.length, 2)
  for (const market of Object.keys(markets)) {
    const sources = snapshot.sources.filter(source => source.market === market)
    assert.equal(sources.length, 1)
    const source = sources[0]
    assert.equal(source.url, sourceUrl(market))
    assert.match(source.sha256, /^[0-9a-f]{64}$/)
    assert.ok(Number.isSafeInteger(source.bytes) && source.bytes > 0)
    const marketRows = snapshot.companies.filter(row => row.market === market)
    const count = marketRows.length
    assert.equal(count, source.count)
    assert.equal(new Set(marketRows.map(row => row.code)).size, source.uniqueCount)
    assert.equal(count - source.uniqueCount, source.duplicateCount)
    assert.ok(count >= markets[market].minimum, '축소되거나 오류인 원본을 확인해주세요.')
  }
  const symbols = new Map()
  for (const row of snapshot.companies) {
    assert.ok(markets[row.market])
    assert.match(row.code, /^[0-9A-Z]{6}$/)
    assert.ok(typeof row.name === 'string' && row.name.trim() && row.name.length <= 200 && !row.name.includes('\uFFFD'))
    assert.ok(typeof row.industry === 'string' && row.industry.trim() && row.industry.length <= 250 && !row.industry.includes('\uFFFD'))
    const symbol = `${row.code}.${markets[row.market].suffix}`
    if (symbols.has(symbol)) {
      assert.deepEqual(row, symbols.get(symbol), '같은 종목코드의 회사 정보가 충돌합니다.')
    } else symbols.set(symbol, row)
  }
  return [...symbols].map(([symbol, row]) => ({ symbol, name: row.name, aliases: [], sectorId: 'unclassified', region: 'KR',
      description: `${row.industry} 업종의 KRX 상장법인`, source: sourceUrl(row.market), underlyingIndex: '', issuer: '',
      assetClass: 'STOCK', currency: 'KRW', verifiedAt: snapshot.verifiedAt }
  )).sort((a, b) => a.symbol.localeCompare(b.symbol, 'en'))
}
function generate() {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'shared/krx-companies.json'), 'utf8'))
  const rows = buildDirectory(snapshot)
  fs.writeFileSync(path.join(root, 'backend/src/main/resources/catalog-directory.json'), JSON.stringify(rows, null, 2) + '\n')
  console.log(`KRX directory: ${rows.length} source-linked companies`)
}
module.exports = { parseKrxHtml, buildDirectory, sourceUrl, generate }
if (require.main === module) {
  const args = process.argv.slice(2)
  if (args.length) {
    assert.equal(args.length, 3, '원본 KOSPI/KOSDAQ 경로와 확인 날짜가 필요합니다.')
    const sources = []
    const companies = []
    Object.keys(markets).forEach((market, index) => {
      const bytes = fs.readFileSync(args[index])
      const rows = parseKrxHtml(bytes, market)
      companies.push(...rows)
      const uniqueCount = new Set(rows.map(row => row.code)).size
      sources.push({ market, url: sourceUrl(market), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), count: rows.length, uniqueCount, duplicateCount: rows.length - uniqueCount })
    })
    const snapshot = { schemaVersion: 1, verifiedAt: args[2], sources, companies }
    buildDirectory(snapshot)
    fs.writeFileSync(path.join(root, 'shared/krx-companies.json'), JSON.stringify(snapshot, null, 2) + '\n')
  }
  generate()
}
