// 차트가 런타임에 요구하는 선택 peer 패키지의 누락을 설치본 생성 전에 차단한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const appRequire = createRequire(path.join(root, 'package.json'));

test('chart gradient dependency is declared, resolvable and supports the installed Android SDK', () => {
  const app = appRequire('./package.json');
  assert.ok(app.dependencies['expo-linear-gradient'], 'Charts require expo-linear-gradient as an app dependency');
  const entry = appRequire.resolve('expo-linear-gradient');
  assert.ok(fs.existsSync(entry));
  const installed = appRequire('expo-linear-gradient/package.json');
  const expected = appRequire('expo/bundledNativeModules.json')['expo-linear-gradient'];
  const expectedSeries = expected.replace(/^[~^]/, '').split('.').slice(0, 2).join('.');
  assert.equal(installed.version.split('.').slice(0, 2).join('.'), expectedSeries);
  const nativeConfig = JSON.parse(fs.readFileSync(path.join(path.dirname(appRequire.resolve('expo-linear-gradient/package.json')), 'expo-module.config.json'), 'utf8'));
  assert.ok(nativeConfig.android.modules.length > 0, 'Gradient must register an Android native module');
});
