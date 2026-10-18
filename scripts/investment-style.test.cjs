const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('../web/node_modules/typescript')
const moduleValue = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../shared/investment-style.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(moduleValue, moduleValue.exports)
const { styleQuestions, investmentStyleResult, validStyleAnswers, saveStyleSnapshot, parseSavedStyle } = moduleValue.exports
const unknown = () => Object.fromEntries(styleQuestions.map(question => [question.id, 'unknown']))

test('열 질문은 서로 다른 ID와 선택지를 가지며 모름을 허용한다', () => {
  assert.equal(styleQuestions.length, 10)
  assert.equal(new Set(styleQuestions.map(q => q.id)).size, 10)
  for (const q of styleQuestions) { assert(q.options.some(option => option.id === 'unknown')); assert.equal(new Set(q.options.map(option => option.id)).size, q.options.length) }
})
test('모른다는 답변을 중간 위험이나 확정된 유형으로 바꾸지 않는다', () => {
  const result = investmentStyleResult(unknown())
  assert.equal(result.kind, 'exploring'); assert.equal(result.capacity, 'unclear'); assert.equal(result.willingness, 'unclear')
  assert.match(result.learning, /시작하기 전/)
})
test('수익과 변동을 원하는 답변이 생활 제약을 상쇄하지 않는다', () => {
  for (const horizon of ['soon', 'middle', 'long', 'unknown']) for (const reserve of ['separate', 'shared', 'unknown']) for (const impact of ['large', 'some', 'small', 'unknown']) {
    const result = investmentStyleResult({ ...unknown(), horizon, reserve, impact, reaction: 'buy', willingness: 'growth', decision: 'research', experience: 'varied' })
    if (horizon === 'soon' || reserve === 'shared' || impact === 'large') { assert.equal(result.capacity, 'limited'); assert(result.notices.some(notice => notice.includes('차이가 있어요'))) }
    else if ([horizon, reserve, impact].includes('unknown')) assert.equal(result.capacity, 'unclear')
    assert.equal(result.willingness, 'accepting'); assert.equal(result.kind, 'research')
  }
})
test('관리 방식은 선호 답변에 근거하며 시간의 불일치는 따로 설명한다', () => {
  for (const decision of ['routine', 'compare', 'research', 'simple']) assert.equal(investmentStyleResult({ ...unknown(), decision }).kind, decision)
  const answer = { ...unknown(), decision: 'research', time: 'brief' }
  const original = structuredClone(answer), result = investmentStyleResult(answer)
  assert(result.notices.some(notice => notice.includes('쓸 시간은 짧다고')))
  assert.equal(result.evidence.length, 2); assert.deepEqual(answer, original)
  assert(!('allocation' in result)); assert(!('riskLevel' in result)); assert(!('recommendations' in result))
})
test('누락·모르는 선택 ID·추가 질문을 거부하고 명시적인 저장만 복원한다', () => {
  assert.equal(parseSavedStyle(null), null)
  assert.equal(validStyleAnswers({}), false)
  assert.equal(validStyleAnswers({ ...unknown(), decision: 'not-valid' }), false)
  assert.equal(validStyleAnswers({ ...unknown(), extra: 'unknown' }), false)
  assert.throws(() => investmentStyleResult({}))
  const answers = unknown(), snapshot = saveStyleSnapshot(answers, new Date('2026-10-18T00:00:00Z'))
  answers.time = 'deep'
  assert.equal(snapshot.answers.time, 'unknown')
  assert.deepEqual(parseSavedStyle(JSON.stringify(snapshot)), snapshot)
  for (const raw of ['broken-json', JSON.stringify({ ...snapshot, version: 999 }), JSON.stringify({ ...snapshot, savedAt: 'invalid' }), JSON.stringify({ ...snapshot, answers: {} })]) assert.throws(() => parseSavedStyle(raw))
})
