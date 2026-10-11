const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture({ os = 'android', response = { type: 'success', data: { idToken: 'test-id-token' } }, failure, available = true } = {}) {
  const calls = [];
  const module = { exports: {} };
  const sdk = {
    GoogleSignin: {
      configure: config => calls.push(['configure', config]),
      hasPlayServices: async () => { calls.push(['playServices']); if (!available) throw { code: 'PLAY_SERVICES_NOT_AVAILABLE' }; },
      signIn: async () => { calls.push(['signIn']); if (failure) throw failure; return response; },
    },
    isSuccessResponse: result => result.type === 'success',
    isErrorWithCode: error => typeof error?.code === 'string',
    statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' },
  };
  const source = ts.transpileModule(fs.readFileSync('src/lib/googleSignIn.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, process: { env: {} }, require(name) {
    if (name === 'expo-constants') return { expoConfig: { extra: { googleWebClientId: 'test-web-client.apps.googleusercontent.com' } } };
    if (name === 'react-native') return { Platform: { OS: os } };
    if (name === '@react-native-google-signin/google-signin') return sdk;
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return { login: module.exports.googleIdToken, calls };
}

test('native login requests an ID token for the server web client after checking Play Services', async () => {
  const f = fixture();
  assert.equal(await f.login(), 'test-id-token');
  assert.equal(f.calls[0][1].webClientId, 'test-web-client.apps.googleusercontent.com');
  assert.equal(f.calls[0][1].offlineAccess, false);
  assert.deepEqual(f.calls.map(call => call[0]), ['configure', 'playServices', 'signIn']);
});
test('cancel returns no token so no server account is linked', async () => {
  assert.equal(await fixture({ response: { type: 'cancelled' } }).login(), null);
  assert.equal(await fixture({ failure: { code: 'SIGN_IN_CANCELLED' } }).login(), null);
});
test('success without an ID token is rejected', async () => {
  await assert.rejects(fixture({ response: { type: 'success', data: { idToken: null } } }).login(), /계정을 확인하지/);
});
test('unavailable Play Services prevents sign-in and gives a recovery instruction', async () => {
  const f = fixture({ available: false });
  await assert.rejects(f.login(), /Play 서비스를 업데이트/);
  assert.equal(f.calls.some(call => call[0] === 'signIn'), false);
});
test('OAuth signature configuration failure has a diagnostic message', async () => {
  await assert.rejects(fixture({ failure: { code: '10' } }).login(), /로그인 오류 10/);
});
test('web preview cannot invoke the Android native module', async () => {
  const f = fixture({ os: 'web' });
  await assert.rejects(f.login(), /Android 설치 앱/);
  assert.equal(f.calls.length, 0);
});
