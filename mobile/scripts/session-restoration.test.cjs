const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
function fixture({ saved, token = 'google-proof', renewFailure } = {}) {
  let value = saved ? JSON.stringify(saved) : null;
  let calls = 0;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('src/lib/session.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require(name) {
    if (name === 'expo-secure-store') return { getItemAsync: async () => value, setItemAsync: async (_, next) => { value = next; }, deleteItemAsync: async () => { value = null; } };
    if (name === './googleSignIn') return { silentGoogleIdToken: async () => token };
    if (name === './api') return { renewGoogleSession: async (old, proof) => { calls++; assert.equal(old, calls === 1 ? 'expired' : 'renewed'); assert.equal(proof, 'google-proof'); await barrier; if (renewFailure) throw new Error('offline'); return { token: calls === 1 ? 'renewed' : 'renewed-again', expiresAt: new Date(Date.now() + 60000).toISOString() }; } };
    throw new Error(name);
  } });
  return { ...module.exports, release, calls: () => calls, stored: () => value,
    expire: () => { value = JSON.stringify({ ...JSON.parse(value), expiresAt: '2000-01-01T00:00:00Z' }); } };
}
const expired = { token: 'expired', expiresAt: '2000-01-01T00:00:00Z' };
test('valid and anonymous sessions never invoke Google renewal', async () => {
  const f = fixture({ saved: { token: 'valid', expiresAt: new Date(Date.now() + 60000).toISOString() } });
  assert.equal(await f.sessionToken(), 'valid'); assert.equal(f.calls(), 0);
  assert.equal(await fixture().sessionToken(), null);
});
test('concurrent expired requests share one renewal and persist the replacement', async () => {
  const f = fixture({ saved: expired }); const first = f.sessionToken(); const second = f.sessionToken();
  f.release(); assert.deepEqual(await Promise.all([first, second]), ['renewed', 'renewed']);
  assert.equal(f.calls(), 1); assert.equal(await f.sessionToken(), 'renewed');
});
test('missing Google proof blocks the request without clearing into anonymous writes', async () => {
  const f = fixture({ saved: expired, token: null });
  await assert.rejects(f.sessionToken(), /로그인이 만료/); assert.equal(f.calls(), 0);
  assert.equal(JSON.parse(f.stored()).token, 'expired');
});
test('offline restoration does not retry for every request or discard the previous session', async () => {
  const f = fixture({ saved: expired, renewFailure: true }); f.release();
  await assert.rejects(f.sessionToken(), /offline/); await assert.rejects(f.sessionToken(), /offline/);
  assert.equal(f.calls(), 1); assert.equal(JSON.parse(f.stored()).token, 'expired');
});
test('logout while renewal is pending cannot resurrect a session', async () => {
  const f = fixture({ saved: expired }); const pending = f.sessionToken();
  while (!f.calls()) await new Promise(resolve => setImmediate(resolve));
  await f.clearSession(); f.release(); await assert.rejects(pending, /변경/);
  assert.equal(f.stored(), null); assert.equal(await f.sessionToken(), null);
});
test('explicit login supersedes an in-flight old restoration', async () => {
  const f = fixture({ saved: expired }); const pending = f.sessionToken();
  while (!f.calls()) await new Promise(resolve => setImmediate(resolve));
  await f.saveSession({ token: 'manual', expiresAt: new Date(Date.now() + 60000).toISOString() });
  f.release(); await assert.rejects(pending, /변경/); assert.equal(await f.sessionToken(), 'manual');
});
test('a stale unauthorized response cannot erase the replacement session', async () => {
  const f = fixture({ saved: expired }); f.release(); await f.sessionToken();
  await f.invalidateSession('expired'); assert.equal(await f.sessionToken(), 'renewed');
  await f.invalidateSession('renewed'); assert.equal(await f.sessionToken(), null);
});
test('the replacement can renew again on a later expiry in the same process', async () => {
  const f = fixture({ saved: expired }); f.release();
  assert.equal(await f.sessionToken(), 'renewed'); f.expire();
  assert.equal(await f.sessionToken(), 'renewed-again'); assert.equal(f.calls(), 2);
});


test('explicit account changes clear retained views, renewal and stale 401 do not', async () => {
  const f = fixture({ saved: expired }); let changes = 0;
  const stop = f.watchAccountSession(() => changes++);
  const restore = f.sessionToken(); f.release(); await restore;
  assert.equal(changes, 0);
  await f.invalidateSession('expired'); assert.equal(changes, 0);
  await f.saveSession({ token: 'manual', expiresAt: new Date(Date.now() + 60000).toISOString() }); assert.equal(changes, 1);
  await f.clearSession(); assert.equal(changes, 2);
  stop(); await f.saveSession({ token: 'other', expiresAt: new Date(Date.now() + 60000).toISOString() }); assert.equal(changes, 2);
});
