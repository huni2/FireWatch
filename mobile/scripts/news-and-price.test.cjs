const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const absolute = path.resolve(file), fixture = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { module: fixture, exports: fixture.exports, require: name => load(path.resolve(path.dirname(absolute), name + '.ts')) });
  return fixture.exports;
}
const { companyNewsGroups } = load('../shared/company-news.ts');
const { formatPriceAxis } = load('../shared/stock-price.ts');
test('incidental company experience in another company article is not promoted as a headline match', () => {
  const incidental = { title: '클래시스 임원 영입', description: '삼성전자 근무 경력' };
  const headline = { title: '<b>삼성전자</b>, 실적 발표' };
  const result = companyNewsGroups([incidental, headline], '삼성전자');
  assert.equal(result.headline[0], headline); assert.equal(result.mentions[0], incidental);
  assert.equal(result.headline.length + result.mentions.length, 2);
});
test('headline grouping handles markup, whitespace and casing without losing articles', () => {
  const a = { title: 'APPLE 실적 발표' }, b = { title: '시장 지표 발표' };
  const result = companyNewsGroups([b,a], ' Apple ');
  assert.equal(result.headline[0], a); assert.equal(result.mentions[0], b);
  assert.equal(companyNewsGroups([a], '').headline.length, 0);
});
test('axis labels shorten large values while preserving dollar-scale and negative labels', () => {
  assert.equal(formatPriceAxis(250000), '25만'); assert.equal(formatPriceAxis(150000000), '1.5억');
  assert.equal(formatPriceAxis(23.45), '23.45'); assert.equal(formatPriceAxis(-250000), '-25만');
  assert.equal(formatPriceAxis(NaN), '');
});
