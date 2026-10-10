// 백업 단계 실패 시 평문/로그 유출을 막고 실제 age 암호화·복호화 왕복을 검증한다.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const posix = value => process.platform === 'win32' ? value.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_,d) => '/'+d.toLowerCase()) : value;
// Resolve before adding the stub directory to PATH, otherwise Linux recurses into its own stub.
const ageBin = process.env.AGE_TEST_BIN || spawnSync(bash,['-c','command -v age'],{encoding:'utf8'}).stdout.trim();
const keygen = process.env.AGE_TEST_KEYGEN || 'age-keygen';
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'firewatch-backup-test-'));
  const bin=path.join(root,'bin'); fs.mkdirSync(bin);
  const identity=path.join(root,'identity');
  const generated=spawnSync(keygen,['-o',identity],{encoding:'utf8'});
  assert.equal(generated.status,0,'age-keygen is required for the encryption regression');
  const recipient=spawnSync(keygen,['-y',identity],{encoding:'utf8'}).stdout.trim();
  const stubs={
    pg_dump:`#!/usr/bin/env bash\nif [[ "$1" == --version ]]; then echo 'pg_dump (PostgreSQL) 17.11'; exit; fi\nif [[ "$FAIL_STAGE" == DUMP_FAILED ]]; then echo SECRET_MARKER >&2; exit 1; fi\nfor arg in "$@"; do [[ "$arg" != --file=* ]] || printf 'PGDMP-private-fixture' > "\${arg#--file=}"; done\n`,
    pg_restore:`#!/usr/bin/env bash\nif [[ "$1" == --version ]]; then echo 'pg_restore (PostgreSQL) 17.11'; exit; fi\n[[ "$FAIL_STAGE" != ARCHIVE_INVALID ]] || { echo SECRET_MARKER >&2; exit 1; }\necho 'table list';\n`,
    age:`#!/usr/bin/env bash\n[[ "$FAIL_STAGE" != ENCRYPT_FAILED ]] || { echo SECRET_MARKER >&2; exit 1; }\nexec "$REAL_AGE" "$@"\n`
  };
  for(const [name,source] of Object.entries(stubs)) fs.writeFileSync(path.join(bin,name),source,{mode:0o700});
  const output=path.join(root,'output'), githubOutput=path.join(root,'github-output');
  const env={...process.env, BACKUP_TEST_BIN:posix(bin), BACKUP_TEST_SCRIPT:posix(path.join(__dirname,'create-encrypted-backup.sh')),
    TMPDIR:posix(root), PGHOST:'fixture.invalid', PGPORT:'5432', PGDATABASE:'postgres', PGUSER:'fixture', PGPASSWORD:'SECRET_MARKER',
    AGE_RECIPIENT:recipient, OUTPUT_DIR:posix(output), GITHUB_OUTPUT:posix(githubOutput), REAL_AGE:ageBin, FAIL_STAGE:''};
  return {root,output,identity,githubOutput,env, run:()=>spawnSync(bash,['-c','export PATH="$BACKUP_TEST_BIN:$PATH"; bash "$BACKUP_TEST_SCRIPT"'],{env,encoding:'utf8',timeout:20000}),
    cleanup:()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep)); fs.rmSync(root,{recursive:true,force:true});}};
}
test('암호화 파일만 남기고 실제 복호화 결과가 일치하며 임시 평문을 제거한다',()=>{
  const f=fixture(); try {
    const result=f.run(); assert.equal(result.status,0,result.stderr);
    assert.deepEqual(fs.readdirSync(f.output).sort(),['checksum.sha256','database.dump.age']);
    assert.match(fs.readFileSync(path.join(f.output,'checksum.sha256'),'utf8'),/^[a-f0-9]{64} [ *]database\.dump\.age\s*$/);
    const decrypted=spawnSync(ageBin,['-d','-i',f.identity,path.join(f.output,'database.dump.age')]);
    assert.equal(decrypted.status,0); assert.equal(decrypted.stdout.toString(),'PGDMP-private-fixture');
    assert.ok(!fs.readdirSync(f.root).some(name=>name.startsWith('tmp.')));
    assert.ok(!result.stdout.includes('SECRET_MARKER'));
  } finally {f.cleanup();}
});
for(const stage of ['DUMP_FAILED','ARCHIVE_INVALID','ENCRYPT_FAILED']) test(stage+' suppresses private error and cannot leave an uploadable file',()=>{
  const f=fixture(); try {
    f.env.FAIL_STAGE=stage; const result=f.run(); assert.notEqual(result.status,0);
    assert.ok(!result.stdout.includes('SECRET_MARKER')&&!result.stderr.includes('SECRET_MARKER'));
    assert.ok(!fs.existsSync(f.output)); assert.match(fs.readFileSync(f.githubOutput,'utf8'),new RegExp('failure_code='+stage));
    assert.ok(!fs.readdirSync(f.root).some(name=>name.startsWith('tmp.')));
  } finally {f.cleanup();}
});
test('existing output is refused without changing its contents',()=>{
  const f=fixture(); try {
    fs.mkdirSync(f.output); fs.writeFileSync(path.join(f.output,'preserved'),'original');
    assert.notEqual(f.run().status,0); assert.equal(fs.readFileSync(path.join(f.output,'preserved'),'utf8'),'original');
  } finally {f.cleanup();}
});
