const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
const unix=p=>p.replaceAll('\\','/').replace(/^([A-Za-z]):/,(_,d)=>'/'+d.toLowerCase());
function run(mode,enabled=true){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'firewatch-ci-start-')),bin=path.join(root,'bin');fs.mkdirSync(bin);
 const output=path.join(root,'output'),calls=path.join(root,'calls');
 fs.writeFileSync(path.join(bin,'docker'),`#!/bin/bash
echo "$*" >> "$TEST_CALLS"
case "$1" in
 pull) [[ "$TEST_MODE" != all-fail && ( "$TEST_MODE" != fallback || "$2" == public.ecr.aws/* ) ]] ;;
 run) echo aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ;;
 inspect) if [[ "$TEST_MODE" == unhealthy ]]; then echo unhealthy; else echo healthy; fi ;;
 logs) echo 'test container log' ;;
 *) exit 1 ;;
esac
`,{mode:0o755});
 const result=spawnSync(bash,[unix(path.join(__dirname,'start-ci-postgres.sh'))],{encoding:'utf8',env:{...process.env,PATH:`${unix(bin)}:/usr/bin:/bin`,GITHUB_ACTIONS:enabled?'true':'false',RUNNER_OS:'Linux',GITHUB_OUTPUT:unix(output),TEST_CALLS:unix(calls),TEST_MODE:mode}});
 const record={...result,calls:fs.existsSync(calls)?fs.readFileSync(calls,'utf8'):'',output:fs.existsSync(output)?fs.readFileSync(output,'utf8'):''};
 assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('firewatch-ci-start-'));
 fs.rmSync(root,{recursive:true,force:true});return record;
}
test('healthy primary image starts a localhost-only test DB and publishes its ID',()=>{const r=run('success');assert.equal(r.status,0,r.stderr);assert.equal((r.calls.match(/^pull /gm)||[]).length,1);assert.match(r.calls,/127\.0\.0\.1:5432:5432/);assert.match(r.output,/container_id=a{64}/)});
test('primary registry rate limit falls back once and still verifies health',()=>{const r=run('fallback');assert.equal(r.status,0,r.stderr);assert.equal((r.calls.match(/^pull /gm)||[]).length,2);assert.match(r.stdout,/trying the next official/);assert.match(r.calls,/inspect/)});
test('all pulls failing and unhealthy startup fail closed without declaring readiness',()=>{for(const mode of ['all-fail','unhealthy']){const r=run(mode);assert.notEqual(r.status,0);assert.equal(r.output,'');if(mode==='all-fail')assert.doesNotMatch(r.calls,/^run /m)}});
test('outside CI refuses to pull or start any database',()=>{const r=run('success',false);assert.notEqual(r.status,0);assert.equal(r.calls,'')});
