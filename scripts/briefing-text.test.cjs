const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('../web/node_modules/typescript')
const loaded = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../shared/briefing-text.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(loaded, loaded.exports)
const { briefingText } = loaded.exports

test('기존 브리핑의 제목, 강조, 목록, 구분선, 링크를 읽기용 문장으로 바꾼다', () => {
  assert.equal(briefingText('## 오늘의 시장\r\n\r\n**상승**과 __주의__\n---\n- [기사](https://example.com)\n> `금리` 확인'), '오늘의 시장\n\n상승과 주의\n\n• 기사\n금리 확인')
})

test('일반 문장과 수치, 문단, 마지막 문장을 보존한다', () => {
  const text = '코스피 -1.2%, 환율 1,400원, 10-20%\n\n' + '추가 내용입니다.\n'.repeat(100) + '마지막 문장'
  assert.equal(briefingText(text), text)
  assert.equal(briefingText(''), '')
})

test('식별자의 밑줄은 보존하고 닫는 제목 기호와 강조만 제거한다', () => {
  assert.equal(briefingText('## 시장 요약 ##\n_주의_\nS&P_500_INDEX와 https://example.com/a_b_c'), '시장 요약\n주의\nS&P_500_INDEX와 https://example.com/a_b_c')
  assert.equal(briefingText('PRICE__BASE__KRW, 2 * 3 * 4, *시장 확인*, __주의__'), 'PRICE__BASE__KRW, 2 * 3 * 4, 시장 확인, 주의')
})
