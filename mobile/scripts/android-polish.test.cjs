const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,requireModule=()=>({})){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:requireModule,Error,Intl,Date});return module.exports;}
const {parsePortfolioNumber,portfolioNumberHint}=load('../shared/portfolio-input.ts');
const {portfolioAsOf}=load('../shared/portfolio-asof.ts');
test('portfolio input accepts correctly grouped pasted values and four decimals without changing raw text',()=>{
  for(const [input,expected] of [[' 100,000 ',100000],['1,000.1234',1000.1234],['0.25',.25],['',0]])assert.equal(parsePortfolioNumber(input),expected);
  assert.match(portfolioNumberHint('100,000','원'),/100,000원/);
  for(const input of ['10,00','1,00,000','1e5','-1','1.12345','1 000','0x10'])assert.ok(Number.isNaN(parsePortfolioNumber(input)),input);
});
test('portfolio date is a quote date, never the edit time; mixed, unknown and FX dates stay explicit',()=>{
  const row=(date,currency='KRW',value=100)=>({quoteAsOf:date,valueKrw:value,holding:{currency}});
  const p={updatedAt:'2030-01-01',fxAsOf:null,holdings:[row('2026-10-08T00:00:00Z')]};
  assert.match(portfolioAsOf(p),/2026/);assert.doesNotMatch(portfolioAsOf(p),/2030/);
  assert.match(portfolioAsOf({...p,holdings:[...p.holdings,row('2026-10-09T00:00:00Z')]}),/종목별/);
  assert.match(portfolioAsOf({...p,holdings:[row(null)]}),/확인하지 못/);
  assert.match(portfolioAsOf({...p,holdings:[row('2026-10-08','USD')]}),/환율 기준 날짜 확인 필요/);
  assert.match(portfolioAsOf({...p,holdings:[]}),/현금/);
});

function hookFixture(){
 const slots=[],effects=[],timeouts=new Map(),intervals=new Map(),requests=[];let cursor=0,next=0;
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}];},useContext:()=>true,useCallback:f=>f,useEffect:f=>effects.push(f)};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/stocks/hooks/useStockHistory.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,Error,require:n=>n==='react'?react:n==='@/lib/api'?{fetchStockHistory:(symbol,range)=>new Promise((resolve,reject)=>requests.push({symbol,range,resolve,reject}))}:{},setTimeout:f=>{timeouts.set(++next,f);return next;},clearTimeout:id=>timeouts.delete(id),setInterval:f=>{intervals.set(++next,f);return next;},clearInterval:id=>intervals.delete(id)});
 const render=(symbol='A',range='1d')=>{cursor=0;effects.length=0;return module.exports.useStockHistory(symbol,range);};
 return{render,start:()=>effects[0](),tick:()=>{const pending=[...timeouts.values()];timeouts.clear();pending.forEach(f=>f());},poll:()=>[...intervals.values()].forEach(f=>f()),requests};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('polling retains the chart on delay and failure, does not overlap and retry recovers',async()=>{
 const f=hookFixture();assert.equal(f.render().loading,true);let cleanup=f.start();f.tick();
 f.requests[0].resolve({symbol:'A',points:[1]});await flush();assert.equal(f.render().loading,false);
 f.poll();f.poll();assert.equal(f.requests.length,2);assert.equal(f.render().refreshing,true);assert.equal(f.render().loading,false);assert.equal(f.render().data.symbol,'A');
 f.requests[1].reject(new Error('offline'));await flush();assert.equal(f.render().data.symbol,'A');assert.equal(f.render().refreshing,false);assert.equal(f.render().error.message,'offline');
 f.render().reload();cleanup();f.render();cleanup=f.start();f.tick();f.requests[2].resolve({symbol:'A',points:[2]});await flush();assert.equal(f.render().data.points[0],2);assert.equal(f.render().error,null);cleanup();
});
test('symbol and range changes hide old data immediately and ignore late completions',async()=>{
 const f=hookFixture();f.render();let cleanup=f.start();f.tick();f.requests[0].resolve({symbol:'A',points:[1]});await flush();
 f.poll();cleanup();assert.equal(f.render('B','1mo').data,null);cleanup=f.start();f.tick();
 f.requests[1].resolve({symbol:'A',points:[99]});await flush();assert.equal(f.render('B','1mo').data,null);
 f.requests[2].resolve({symbol:'B',points:[2]});await flush();assert.equal(f.render('B','1mo').data.symbol,'B');
 cleanup();assert.equal(f.render('B','6mo').data,null);
});
