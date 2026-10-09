// 공식 스냅샷 비교의 회사 변경·누락·날짜 역행과 읽기 전용 CLI를 검증한다.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { compareSnapshots } = require('./build-krx-directory.cjs')
const snapshot = require('../shared/krx-companies.json')
function recount(data) {
  for (const source of data.sources) {
    const rows = data.companies.filter(row => row.market === source.market)
    source.count = rows.length
    source.uniqueCount = new Set(rows.map(row => row.code)).size
    source.duplicateCount = source.count - source.uniqueCount
  }
  return data
}
test('같은 목록과 확인 날짜만 달라진 재확인은 회사 변경이 아니다', () => {
  const next = structuredClone(snapshot); next.verifiedAt = '2026-10-10'
  for (const data of [snapshot, next]) {
    const result = compareSnapshots(snapshot, data)
    assert.deepEqual(result.counts, { previous:2651,next:2651,added:0,renamed:0,industryChanged:0,missing:0,unchanged:2651 })
  }
})
test('추가·이름과 업종 변경·누락을 구분하고 조건부 갱신과 삭제 금지를 명시한다', () => {
  const next = structuredClone(snapshot); next.verifiedAt = '2026-10-10'
  next.companies = next.companies.filter(row => row.code !== '0001A0')
  for (const row of next.companies) if (row.code === '0220W0') { row.name = '변경 법인'; row.industry = '변경 업종' }
  next.companies.push({market:'stockMkt',code:'990001',name:'검증 추가 법인',industry:'검증 업종'})
  const result = compareSnapshots(snapshot, recount(next))
  assert.deepEqual(result.counts, {previous:2651,next:2651,added:1,renamed:1,industryChanged:1,missing:1,unchanged:2649})
  assert.deepEqual(result.added, [{symbol:'990001.KS',name:'검증 추가 법인'}])
  assert.equal(result.renamed[0].symbol,'0220W0.KS')
  assert.equal(result.industryChanged[0].after,'변경 업종')
  assert.equal(result.missing[0].symbol,'0001A0.KQ')
  assert.deepEqual(result.databasePolicy,{existingRowsAutoUpdated:true,requiresMatchingOfficialBaseline:true,requiresNewerVerifiedAt:true,missingRowsAutoDeleted:false,missingMeansDelisted:false})
})
test('역행 날짜·손상된 다음 자료·충돌하는 반복 행은 보고서 생성 전에 거절한다', () => {
  for (const corrupt of [
    data => {data.verifiedAt='2026-10-08'},
    data => {data.sources[0].url='https://example.invalid'},
    data => {data.companies.push({...data.companies[0],name:'충돌'});recount(data)}
  ]) {
    const next=structuredClone(snapshot);corrupt(next)
    assert.throws(()=>compareSnapshots(snapshot,next))
  }
})
test('diff CLI는 JSON 보고서만 출력하며 실제 스냅샷과 리소스를 쓰지 않는다', () => {
  const input=path.join(__dirname,'../shared/krx-companies.json'),output=path.join(__dirname,'../backend/src/main/resources/catalog-directory.json')
  const originals=[fs.readFileSync(input),fs.readFileSync(output)]
  const result=spawnSync(process.execPath,[path.join(__dirname,'build-krx-directory.cjs'),'--diff',input,input],{encoding:'utf8'})
  assert.equal(result.status,0,result.stderr)
  assert.equal(JSON.parse(result.stdout).counts.unchanged,2651)
  assert.deepEqual(fs.readFileSync(input),originals[0]);assert.deepEqual(fs.readFileSync(output),originals[1])
})
test('생성 CLI의 날짜 역행 실패는 기존 파일을 보존하고 정상 재확인은 보고서를 출력한다', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(),'firewatch-krx-diff-'))
  try {
    const encode = value => [...value].map(char=>`&#${char.codePointAt(0)};`).join('')
    const headers=['회사명','시장구분','종목코드','업종','주요제품','상장일','결산월','대표자명','홈페이지','지역']
    fs.mkdirSync(path.join(temporary,'scripts'))
    fs.mkdirSync(path.join(temporary,'shared'))
    fs.mkdirSync(path.join(temporary,'backend/src/main/resources'),{recursive:true})
    const script=path.join(temporary,'scripts/build-krx-directory.cjs')
    fs.copyFileSync(path.join(__dirname,'build-krx-directory.cjs'),script)
    const input=path.join(temporary,'shared/krx-companies.json'),output=path.join(temporary,'backend/src/main/resources/catalog-directory.json')
    const original=JSON.stringify(snapshot); fs.writeFileSync(input,original); fs.writeFileSync(output,'unchanged')
    const rawFiles=Object.keys({stockMkt:1,kosdaqMkt:1}).map(market=>{
      const file=path.join(temporary,market+'.html'),label=market==='stockMkt'?'유가':'코스닥'
      const rows=snapshot.companies.filter(row=>row.market===market).map(row=>'<tr>'+[row.name,label,row.code,row.industry,'','','','','',''].map(value=>`<td>${encode(value)}</td>`).join('')+'</tr>').join('')
      fs.writeFileSync(file,'<table><tr>'+headers.map(value=>`<th>${encode(value)}</th>`).join('')+'</tr>'+rows+'</table>')
      return file
    })
    const rejected=spawnSync(process.execPath,[script,...rawFiles,'2026-10-08'],{encoding:'utf8'})
    assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/이전 날짜/)
    assert.equal(fs.readFileSync(input,'utf8'),original);assert.equal(fs.readFileSync(output,'utf8'),'unchanged')
    const accepted=spawnSync(process.execPath,[script,...rawFiles,'2026-10-10'],{encoding:'utf8'})
    assert.equal(accepted.status,0,accepted.stderr);assert.match(accepted.stdout,/"unchanged": 2651/)
    assert.equal(JSON.parse(fs.readFileSync(output,'utf8')).length,2651)
  } finally {
    assert.equal(path.dirname(temporary),path.resolve(os.tmpdir()))
    assert.ok(path.basename(temporary).startsWith('firewatch-krx-diff-'))
    fs.rmSync(temporary,{recursive:true,force:true})
  }
})
