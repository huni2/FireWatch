// 공식 법인 목록의 필드 손상·중복 충돌·축소를 막고 재생성 결과를 검증한다.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parseKrxHtml, buildDirectory } = require('./build-krx-directory.cjs')
const snapshot = require('../shared/krx-companies.json')
const clone = () => structuredClone(snapshot)
const entities = text => [...text].map(char => `&#${char.codePointAt(0)};`).join('')
function html(name = entities('검증기업'), product = '') {
  const header = ['회사명', '시장구분', '종목코드', '업종', '주요제품', '상장일', '결산월', '대표자명', '홈페이지', '지역'].map(text => `<th>${entities(text)}</th>`).join('')
  const cells = [name, entities('코스닥'), '0001A0', entities('소프트웨어 개발'), product, '', '', '', '', ''].map(text => `<td>${text}</td>`).join('')
  return Buffer.from(`<table><tr>${header}</tr><tr>${cells}</tr></table>`, 'latin1')
}
test('공식 필드와 영숫자 코드를 읽고 불필요한 개인정보는 저장하지 않는다', () => {
  assert.deepEqual(parseKrxHtml(html(), 'kosdaqMkt'), [{ name: '검증기업', code: '0001A0', industry: '소프트웨어 개발', market: 'kosdaqMkt' }])
})
test('저장할 필드의 인코딩 손상은 거절하고 저장하지 않는 제품 필드와 구분한다', () => {
  assert.throws(() => parseKrxHtml(html('\xff'), 'kosdaqMkt'), /손상/)
  assert.equal(parseKrxHtml(html(entities('검증기업'), '\xff'), 'kosdaqMkt')[0].name, '검증기업')
})
test('잘못된 시장과 불완전한 표는 거절한다', () => {
  assert.throws(() => parseKrxHtml(html(), 'stockMkt'), /시장구분/)
  assert.throws(() => parseKrxHtml(Buffer.from('<table>error</table>'), 'kosdaqMkt'), /자료/)
})
test('실제 원본의 일치하는 반복 행만 합치며 생성 파일을 재현한다', () => {
  const rows = buildDirectory(snapshot)
  assert.equal(snapshot.companies.length, 2688)
  assert.equal(rows.length, 2651)
  assert.deepEqual(rows, JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/src/main/resources/catalog-directory.json'), 'utf8')))
  assert.ok(rows.some(row => row.symbol === '0001A0.KQ'))
  assert.ok(rows.some(row => row.symbol === '0220W0.KS'))
  assert.ok(rows.every(row => row.sectorId === 'unclassified' && !('price' in row)))
})
test('같은 코드의 충돌하는 이름을 합치지 않는다', () => {
  const data = clone()
  const first = data.companies[0]
  data.companies.push({ ...first, name: '다른 회사' })
  data.sources.find(source => source.market === first.market).count++
  data.sources.find(source => source.market === first.market).duplicateCount++
  assert.throws(() => buildDirectory(data), /충돌/)
})
test('다른 시장의 출처·축소된 원본·잘못된 코드·한글 손상을 거절한다', () => {
  for (const corrupt of [
    data => { data.sources[0].url = 'https://example.invalid' },
    data => { data.companies.pop() },
    data => { data.companies[0].code = '0001;0' },
    data => { data.companies[0].name = '손상\ufffd' },
    data => { data.verifiedAt = '2026-02-30' }
  ]) {
    const data = clone()
    corrupt(data)
    assert.throws(() => buildDirectory(data))
  }
})
