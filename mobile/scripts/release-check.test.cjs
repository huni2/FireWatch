const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('./release-check.cjs');
const config = {
  android: { package: 'com.firewatch.mobile', versionCode: 1 },
  extra: { eas: { projectId: 'test-project' } },
};
const env = {
  EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com',
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: '123-test.apps.googleusercontent.com',
};
const validFile = () => JSON.stringify({
  project_info: { project_id: 'test-firebase' },
  client: [{ client_info: { android_client_info: { package_name: 'com.firewatch.mobile' } } }],
});

test('complete release configuration passes without contacting providers', () => {
  assert.deepEqual(validate(config, env, validFile), []);
});
test('unsafe API addresses are rejected', () => {
  for (const url of ['http://api.example.com', 'https://localhost', 'https://127.0.0.1', 'https://a:b@api.example.com', 'https://api.example.com?key=test']) {
    assert.ok(validate(config, { ...env, EXPO_PUBLIC_API_BASE_URL: url }, validFile).length);
  }
});
test('missing OAuth ID is rejected', () => {
  assert.ok(validate(config, { ...env, EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: '' }, validFile).length);
});
test('missing or malformed Firebase config is rejected without echoing content', () => {
  for (const read of [() => { throw new Error('secret file content'); }, () => 'private text']) {
    const errors = validate(config, env, read);
    assert.equal(errors.length, 1);
    assert.ok(!errors.join().includes('secret'));
  }
});
test('Firebase config for another package is rejected', () => {
  assert.ok(validate({ ...config, android: { ...config.android, package: 'other.app' } }, env, validFile).length);
});
test('EAS file variable is used instead of the local fallback', () => {
  let readPath;
  assert.deepEqual(validate(config, { ...env, GOOGLE_SERVICES_JSON: '/tmp/eas-config.json' }, file => {
    readPath = file;
    return validFile();
  }), []);
  assert.equal(readPath, '/tmp/eas-config.json');
});
test('public server secrets are blocked without displaying their value', () => {
  const errors = validate(config, { ...env, EXPO_PUBLIC_OPERATOR_API_KEY: 'test-secret' }, validFile);
  assert.equal(errors.length, 1);
  assert.ok(!errors.join().includes('test-secret'));
});
test('invalid version and missing project ID are rejected', () => {
  assert.equal(validate({ android: { package: 'com.firewatch.mobile', versionCode: 0 } }, env, validFile).length, 2);
});
