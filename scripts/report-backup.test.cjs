// 보고 목적지·입력 제한과 무재시도 발송을 비밀값 없는 curl 대역으로 검증한다.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const posix = v => process.platform === 'win32' ? v.replaceAll('\\','/').replace(/^([A-Za-z]):/,(_,d)=>'/'+d.toLowerCase()) : v;
function run(overrides={}) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'firewatch-report-test-'));
  try {
    fs.writeFileSync(path.join(root,'curl'), '#!/usr/bin/env bash\nprintf "%s\\n" "$@" > "$REPORT_ARGS"\necho SECRET_MARKER >&2\nexit "${CURL_STATUS:-0}"\n',{mode:0o700});
    const args=path.join(root,'args');
    const env={...process.env, REPORT_BIN:posix(root), REPORT_ARGS:posix(args), REPORT_SCRIPT:posix(path.join(__dirname,'report-backup.sh')),
      BACKEND_URL:'https://firewatch-backend-q3cv.onrender.com', OPERATOR_KEY:'SECRET_MARKER', BACKUP_RUN_ID:'123-1', FAILURE_CODE:'DUMP_FAILED', ...overrides};
    const result=spawnSync(bash,['-c','export PATH="$REPORT_BIN:$PATH"; bash "$REPORT_SCRIPT"'],{env,encoding:'utf8'});
    assert.ok(!result.stdout.includes('SECRET_MARKER')&&!result.stderr.includes('SECRET_MARKER'));
    return {status:result.status,args:fs.existsSync(args)?fs.readFileSync(args,'utf8'):null};
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));
    fs.rmSync(root,{recursive:true,force:true});
  }
}
test('reports a fixed error code without curl retries or private output',()=>{
  const result=run(); assert.equal(result.status,0);
  assert.match(result.args,/--retry\n0\n/);
  assert.match(result.args,/\{"runId":"123-1","failureCode":"DUMP_FAILED"\}/);
});
test('invalid destination and untrusted message never invoke curl',()=>{
  for(const input of [{BACKEND_URL:'https://other.invalid'},{FAILURE_CODE:'private database exception'},{BACKUP_RUN_ID:'123"'},{OPERATOR_KEY:'key\nheader'}]) {
    const result=run(input); assert.notEqual(result.status,0); assert.equal(result.args,null);
  }
});
test('delivery failure exits nonzero and success report omits failureCode',()=>{
  assert.notEqual(run({CURL_STATUS:'22'}).status,0);
  const result=run({FAILURE_CODE:''}); assert.equal(result.status,0); assert.match(result.args,/\{"runId":"123-1"\}/);
});
