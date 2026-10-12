const { test } = require('node:test');
const assert = require('node:assert/strict');
const { properties } = require('../plugins/android-release-size.cjs');
test('preview keeps 32/64-bit phones and enables both release optimizations', () => {
  assert.equal(properties().reactNativeArchitectures, 'armeabi-v7a,arm64-v8a');
  assert.equal(properties()['android.enableMinifyInReleaseBuilds'], 'true');
  assert.equal(properties()['android.enableShrinkResourcesInReleaseBuilds'], 'true');
});
test('development emulators and Play AAB retain all architectures', () => {
  for (const profile of ['development', 'production']) assert.equal(properties(profile).reactNativeArchitectures, 'armeabi-v7a,arm64-v8a,x86,x86_64');
});
