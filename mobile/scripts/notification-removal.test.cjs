const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(stored, { lookupFails = false, saveFails = false } = {}) {
  const calls = [];
  const module = { exports: {} };
  const mocks = {
    'expo-constants': { __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'fixture' } } } } },
    'expo-notifications': { setNotificationHandler() {}, async getExpoPushTokenAsync() { calls.push('lookup'); if (lookupFails) throw Error('offline'); return { data: 'this-device' }; } },
    'expo-secure-store': { async getItemAsync() { return stored; }, async deleteItemAsync() { calls.push('delete'); stored = null; } },
    'expo-router': { router: {} }, react: { useEffect() {} }, 'react-native': { Platform: { OS: 'android' } },
    '@/lib/api': { async updateSettings(payload) { calls.push(JSON.parse(JSON.stringify(payload))); if (saveFails) throw Error('server unavailable'); } },
  };
  const code = ts.transpileModule(fs.readFileSync(require('node:path').resolve(__dirname, '../src/features/notifications/hooks/useNotificationRegistration.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => { if (!mocks[name]) throw Error(name); return mocks[name]; } });
  return { api: module.exports, calls, stored: () => stored };
}
test('one click removes only this device token and clears local status after server success', async () => {
  const f = fixture('this-device'); await f.api.unregisterPushToken();
  assert.deepEqual(f.calls, [{ removeFcmToken: 'this-device' }, 'delete']); assert.equal(f.stored(), null);
});
test('failed server removal keeps the registered token for a later retry', async () => {
  const f = fixture('this-device', { saveFails: true }); await assert.rejects(f.api.unregisterPushToken(), /server unavailable/);
  assert.equal(f.stored(), 'this-device'); assert.equal(f.calls.includes('delete'), false);
});
test('older APK registration resolves its existing token without permission request and does not fake success offline', async () => {
  const f = fixture(null); await f.api.unregisterPushToken();
  assert.deepEqual(f.calls, ['lookup', { removeFcmToken: 'this-device' }, 'delete']);
  const failed = fixture(null, { lookupFails: true }); await assert.rejects(failed.api.unregisterPushToken(), /offline/);
  assert.deepEqual(failed.calls, ['lookup']);
});
