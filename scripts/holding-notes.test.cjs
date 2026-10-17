const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('../web/node_modules/typescript')
const loaded = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../shared/holding-notes.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(loaded, loaded.exports)
const { emptyHoldingNote, normalizedNote, noteIsEmpty, holdingNoteError, holdingNotePickerDate, holdingNoteDateText, koreanToday, holdingNoteRows, noteDateLabel } = loaded.exports

test('선택한 날짜는 요일과 함께 표시하며 날짜가 없으면 선택을 안내한다', () => {
  assert.equal(holdingNoteDateText('2026-10-24'), '2026. 10. 24. (토)')
  assert.equal(holdingNoteDateText(' 2026-10-25 '), '2026. 10. 25. (일)')
  for (const date of [null, '', '   ', '2026-02-30']) assert.equal(holdingNoteDateText(date), '날짜 선택 (선택 사항)')
})

test('달력은 날짜의 공백을 정리하고 빈 값과 잘못된 날짜는 한국 오늘 날짜로 연다', () => {
  const now = new Date('2026-10-17T15:30:00Z')
  const localParts = date => {
    assert.ok(Number.isFinite(date.getTime()))
    return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()]
  }
  for (const input of ['2026-10-17', ' 2026-10-17 ', '\t2026-10-17\n']) {
    assert.deepEqual(localParts(holdingNotePickerDate(input, now)), [2026, 10, 17, 12])
  }
  for (const input of [null, '', '   ', '2026-02-30', 'not-a-date', '1999-12-31', '2101-01-01']) {
    assert.deepEqual(localParts(holdingNotePickerDate(input, now)), [2026, 10, 18, 12])
  }
  for (const [input, expected] of [['2000-01-01', [2000, 1, 1, 12]], ['2028-02-29', [2028, 2, 29, 12]], ['2100-12-31', [2100, 12, 31, 12]]]) {
    assert.deepEqual(localParts(holdingNotePickerDate(input, now)), expected)
  }
})
test('날짜 없는 선택 메모와 공백 삭제를 구분하고 원본은 변경하지 않는다', () => {
  const draft = { ...emptyHoldingNote(), reason: '  기록\n이유  ', reviewDate: '   ' }
  assert.deepEqual(normalizedNote(draft), { reason: '기록\n이유', nextCheck: '', reflection: '', reviewDate: null })
  assert.equal(noteIsEmpty(draft), false)
  assert.equal(noteIsEmpty({ ...emptyHoldingNote(), reason: '  ' }), true)
  assert.equal(draft.reason, '  기록\n이유  ')
})
test('윤년 날짜를 확인하고 존재하지 않는 날짜와 지원 범위를 거부한다', () => {
  for (const date of ['2028-02-29', '2000-01-01', '2100-12-31']) assert.equal(holdingNoteError({ ...emptyHoldingNote(), reviewDate: date }), null)
  for (const date of ['2026-02-29', '2026-02-30', '2026-2-01', '1999-12-31', '2101-01-01', 'not-a-date']) assert.ok(holdingNoteError({ ...emptyHoldingNote(), reviewDate: date }))
})
test('메모와 복기의 길이 제한을 별도로 적용한다', () => {
  assert.equal(holdingNoteError({ ...emptyHoldingNote(), reason: '가'.repeat(500), reflection: '나'.repeat(1000) }), null)
  assert.ok(holdingNoteError({ ...emptyHoldingNote(), nextCheck: '가'.repeat(501) }))
  assert.ok(holdingNoteError({ ...emptyHoldingNote(), reflection: '가'.repeat(1001) }))
})
test('한국 날짜의 자정 경계에서 재점검 상태를 판단한다', () => {
  assert.equal(koreanToday(new Date('2026-10-17T14:59:59Z')), '2026-10-17')
  assert.equal(koreanToday(new Date('2026-10-17T15:00:00Z')), '2026-10-18')
  assert.equal(noteDateLabel({ reviewDate: '2026-10-17' }, '2026-10-17'), '오늘 다시 확인하기')
  assert.match(noteDateLabel({ reviewDate: '2026-10-16' }, '2026-10-17'), /지났어요/)
  assert.equal(noteDateLabel({ reviewDate: null }, '2026-10-17'), '날짜 없이 보관 중')
  assert.equal(noteDateLabel({ reviewDate: '2026-10-24' }, '2026-10-17'), '다시 확인할 날짜 · 2026. 10. 24. (토)')
  assert.equal(noteDateLabel({ reviewDate: '2026-10-16' }, '2026-10-17'), '다시 확인할 날짜가 지났어요 · 2026. 10. 16. (금)')
})
test('재점검할 메모를 우선하며 이전 보유 메모와 이전 서버 응답을 보존한다', () => {
  const note = (symbol, date) => ({ ...emptyHoldingNote(), symbol, name: symbol, reviewDate: date, updatedAt: '2026-10-17T00:00:00Z' })
  const p = { holdings: [{ holding: { symbol: 'HELD', name: '현재 이름' } }], holdingNotes: [note('FUTURE', '2026-12-01'), note('HELD', null), note('ARCHIVED', '2026-10-16')] }
  const rows = holdingNoteRows(p, '2026-10-17')
  assert.deepEqual(rows.map(row => row.note.symbol), ['ARCHIVED', 'FUTURE', 'HELD'])
  assert.equal(rows[0].archived, true); assert.equal(rows[0].due, true)
  assert.equal(rows[2].name, '현재 이름'); assert.equal(rows[2].archived, false)
  assert.equal(p.holdingNotes[0].symbol, 'FUTURE')
  assert.deepEqual(holdingNoteRows({ holdings: [] }), [])
})
