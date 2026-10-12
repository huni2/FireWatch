const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const babel = require('@babel/core');
const generate = require('@babel/generator').default;
// Run the installed React Native implementation: a fake loop would miss its finished flag.
const implementation = fs.readFileSync('node_modules/react-native/Libraries/Animated/AnimatedImplementation.js', 'utf8');
const loopSource = implementation.slice(implementation.indexOf('const loopImpl = function'), implementation.indexOf('function forkEventImpl'));
assert.ok(loopSource.startsWith('const loopImpl = function'), 'Installed React Native loop must be present');
const ast = babel.transformSync(loopSource, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-flow-strip-types'], ast: true, code: false }).ast;
const declaration = ast.program.body.flatMap(node => node.declarations || []).find(node => node.id?.name === 'loopImpl');
const nativeLoop = vm.runInNewContext('(' + generate(declaration.init).code + ')');
const moduleUnderTest = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/loadingMotion.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: moduleUnderTest, exports: moduleUnderTest.exports });
const { bindLoadingMotion } = moduleUnderTest.exports;
function fixture() {
  let starts = 0, removes = 0, callback, resolve, reject, stopped = false;
  const promise = new Promise((a,b) => { resolve = a; reject = b; });
  const loop = nativeLoop({ start() { starts++; stopped = false; }, stop() { stopped = true; }, reset() {}, _isUsingNativeDriver() { return false; } });
  const preference = { isReduceMotionEnabled: () => promise, addEventListener(_, update) { callback = update; return { remove() { removes++; } }; } };
  return { loop, preference, resolve, reject, change: reduce => callback(reduce), starts: () => starts, stopped: () => stopped, removes: () => removes };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('old stop-then-start sequence reproduces a stationary bar in React Native', () => {
  const f = fixture(); f.loop.stop(); f.loop.start(); assert.equal(f.starts(), 0);
});
test('normal preference starts the real React Native loop after reset', async () => {
  const f = fixture(), dispose = bindLoadingMotion(f.loop, f.preference);
  f.resolve(false); await settle(); assert.equal(f.starts(), 1); assert.equal(f.stopped(), false);
  dispose(); assert.equal(f.stopped(), true); assert.equal(f.removes(), 1);
});
test('reduced motion is static and switching it off restarts animation', async () => {
  const f = fixture(), dispose = bindLoadingMotion(f.loop, f.preference);
  f.resolve(true); await settle(); assert.equal(f.starts(), 0);
  f.change(false); assert.equal(f.starts(), 1); f.change(true); assert.equal(f.stopped(), true);
  f.change(false); assert.equal(f.starts(), 2); dispose();
});
test('a newer accessibility event beats a late initial preference query', async () => {
  const f = fixture(), dispose = bindLoadingMotion(f.loop, f.preference);
  f.change(true); f.resolve(false); await settle(); assert.equal(f.starts(), 0); dispose();
});
test('unmounted loader cannot start from a late preference response', async () => {
  const f = fixture(), dispose = bindLoadingMotion(f.loop, f.preference);
  dispose(); f.resolve(false); await settle(); assert.equal(f.starts(), 0);
});
test('preference lookup failure still shows a moving busy indicator', async () => {
  const f = fixture(), dispose = bindLoadingMotion(f.loop, f.preference);
  f.reject(new Error('unavailable')); await settle(); assert.equal(f.starts(), 1); dispose();
});
