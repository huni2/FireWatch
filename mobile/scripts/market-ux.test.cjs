const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const ts = require('typescript');
function load(file, globals = {}) {
  const fixture={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{module:fixture,exports:fixture.exports,...globals});
  return fixture.exports;
}
const {marketHistoryWindow,marketPoints}=load('../shared/market-history.ts');
test('history dates use Korea midnight across month/year boundaries',()=>{
  const range=marketHistoryWindow(7,Date.parse('2025-12-31T15:00:00Z'));
  assert.equal(range.to,'2026-01-01'); assert.equal(range.from,'2025-12-26');
});
test('missing observations are omitted instead of invented zero prices and other metrics stay independent',()=>{
  const records=[{briefingDate:'2026-10-03',kospi:3000,usdKrw:null},{briefingDate:'2026-10-01',kospi:null,usdKrw:1300},{briefingDate:'2026-10-02',kospi:NaN}];
  const stocks=marketPoints(records,'kospi','2026-10-01','2026-10-03');
  assert.equal(stocks.length,1); assert.equal(stocks[0].date,'2026-10-03');
  assert.equal(marketPoints(records,'usdKrw','2026-10-01','2026-10-03')[0].value,1300);
});
test('duplicate days, reversed API order and out-of-range data do not create extra points',()=>{
  const result=marketPoints([{briefingDate:'2026-10-03',kospi:3000},{briefingDate:'2026-10-01',kospi:2000},{briefingDate:'2026-10-03',kospi:9999},{briefingDate:'2026-09-30',kospi:1000}],'kospi','2026-10-01','2026-10-03');
  assert.equal(result.length,2); assert.equal(result[0].value,2000); assert.equal(result[1].value,3000);
});
function apiFixture(fail=false){
  const calls=[];
  const api=load('src/lib/api.ts',{process:{env:{}},AbortController,setTimeout,clearTimeout,fetch:async(url,init)=>{calls.push(JSON.parse(init.body));return {ok:!fail,status:fail?500:200,json:async()=>fail?{error:{code:'FAILED',message:'failed'}}:{watchedStocks:[]}}},require:name=>name==='./deviceId'?{getDeviceId:async()=> 'test-device'}:{sessionToken:async()=>null}});
  return {api,calls};
}
test('removing the final watch sends an empty array and notifies mounted lists only after success',async()=>{
  const {api,calls}=apiFixture(); let notices=0;
  const stop=api.onSettingsChanged(()=>notices++);
  const saved=await api.updateSettings({watchedStocks:[]});
  assert.equal(saved.watchedStocks.length,0);assert.equal(calls[0].watchedStocks.length,0);assert.equal(notices,1);
  stop();await api.updateSettings({watchedStocks:[]});assert.equal(notices,1);
});
test('failed watch writes never publish a successful list refresh',async()=>{
  const {api}=apiFixture(true);let notices=0;api.onSettingsChanged(()=>notices++);
  await assert.rejects(api.updateSettings({watchedStocks:[]}));assert.equal(notices,0);
});
