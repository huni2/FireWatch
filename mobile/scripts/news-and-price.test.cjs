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
const { stockPriceWindow, formatPriceChange } = load('../shared/stock-price.ts');
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
test('small up and down moves share a bounded price scale and preserve the real change', () => {
  const up = stockPriceWindow([100000,100100], 'KRW'), down = stockPriceWindow([100000,99900], 'KRW');
  assert.equal(up.direction,'up'); assert.equal(down.direction,'down');
  assert.equal(up.change,100); assert.equal(up.percent,.1);
  for (const result of [up,down]) {
    assert.ok(result.minimum>99000); assert.ok(result.maximum-result.minimum>=500);
    assert.ok(result.minimum<Math.min(result.first,result.last));
    assert.ok(result.maximum>Math.max(result.first,result.last));
  }
  assert.match(formatPriceChange(down.change,down.percent,'KRW'), /−0.10%/);
});
test('flat, single, missing and large-move data do not invent direction or zero-price drops', () => {
  const flat=stockPriceWindow([100,100],'USD'); assert.equal(flat.direction,'flat'); assert.ok(flat.maximum>flat.minimum);
  assert.equal(stockPriceWindow([100],'USD').percent,0);
  assert.equal(stockPriceWindow([NaN,0,-1]),null);
  const large=stockPriceWindow([100,50,160],'USD'); assert.ok(large.minimum<50);assert.ok(large.maximum>160);
  const tiny=stockPriceWindow([100,100.001],'USD'); assert.match(formatPriceChange(tiny.change,tiny.percent,'USD'), /0.01% 미만/);
});

test('rendered stock chart retains exact tooltip prices with a truncated axis and no fill or curve', () => {
  const fixture={exports:{}};
  const source=ts.transpileModule(fs.readFileSync('src/features/stocks/components/StockChart.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{module:fixture,exports:fixture.exports,require:name=>{
    if(name==='react')return {useState:()=>['1wk',()=>{}],useMemo:fn=>fn(),useEffect:()=>{}};
    if(name==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',useWindowDimensions:()=>({width:360})};
    if(name==='react-native-gifted-charts')return {LineChart:'LineChart'};
    if(name==='@/lib/theme')return {useTheme:()=>({colors:{danger:'red',negative:'blue',muted:'gray'}})};
    if(name==='@/lib/chartSelection')return {useChartSelection:()=>({version:0,onTouchStart:()=>{}})};
    if(name==='../hooks/useStockHistory')return {useStockHistory:()=>({data:{symbol:'TEST',currency:'KRW',points:[{timestamp:'2026-10-01',close:100000},{timestamp:'2026-10-02',close:99900}]},loading:false,error:null})};
    if(name==='./CompanyNews')return {CompanyNews:'News'};
    if(name==='@/components/LoadingState')return {LoadingState:'Loading'};
    if(name==='@/components/ActionButton')return {ActionButton:'ActionButton'};
    if(name.endsWith('/stock-labels'))return {stockLabel:()=> '시험 기업'};
    if(name.endsWith('/stock-price'))return load('../shared/stock-price.ts');
    return require(name);
  }});
  function find(node,type){if(!node||typeof node!=='object')return;if(node.type===type)return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,type);if(result)return result;}}
  const chart=find(fixture.exports.StockChart({symbol:'TEST',showNews:false}),'LineChart');
  assert.equal(chart.props.color,'blue'); assert.equal(chart.props.areaChart,undefined);assert.equal(chart.props.curved,undefined);
  assert.ok(chart.props.yAxisOffset>99000);assert.equal(chart.props.referenceLine1Position,100000);
  assert.equal(chart.props.data[1].value,99900);
  const label=chart.props.pointerConfig.pointerLabelComponent([{value:300,observedPrice:99900,timestamp:'2026-10-02'}]);
  assert.match(label.props.children[0].props.children,/99,900/);
  assert.notEqual(chart.props.formatYLabel('99900'),chart.props.formatYLabel('100000'));
});
