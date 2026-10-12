const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Isolated hook-state harness: exercise request ordering without a device or API.
function fixture(fetcher, activity = { active: true }) {
  const effects = [];
  const slots = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useContext() { return activity.active; }, useCallback(fn) { return fn; }, useEffect(effect) { effects.push(effect); },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/lib/useResource.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Error, setTimeout, clearTimeout, require: name => name === 'react' ? react : { AppState: { addEventListener() { return { remove() {} }; } } } });
  const render = () => { cursor = 0; effects.length = 0; return module.exports.useResource(fetcher); };
  render.startEffect = () => effects[0]?.();
  return render;
}
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; }

test('initial and automatic reload never turn on the pull-to-refresh indicator', async () => {
  const d = deferred(), render = fixture(() => d.promise);
  const task = render().reload();
  assert.equal(render().loading, true); assert.equal(render().refreshing, false);
  d.resolve({ value: 1 }); await task;
  assert.equal(render().loading, false); assert.equal(render().data.value, 1);
});
test('manual refresh preserves the visible data and stops on failure', async () => {
  const d = deferred(), render = fixture(() => d.promise);
  render().replaceData({ value: 1 }); const task = render().refresh();
  assert.equal(render().refreshing, true); assert.equal(render().data.value, 1);
  d.reject(new Error('test failure')); await task;
  assert.equal(render().refreshing, false); assert.equal(render().error, 'test failure'); assert.equal(render().data.value, 1);
});
test('stale completion cannot stop a later manual refresh or overwrite it', async () => {
  const first = deferred(), second = deferred(); let requests = 0;
  const render = fixture(() => (++requests === 1 ? first : second).promise);
  const a = render().reload(), b = render().refresh();
  first.resolve('stale'); await a;
  assert.equal(render().refreshing, true); assert.equal(render().data, null);
  second.resolve('latest'); await b;
  assert.equal(render().refreshing, false); assert.equal(render().data, 'latest');
});
test('saved replacement clears both indicators and wins over an outstanding request', async () => {
  const d = deferred(), render = fixture(() => d.promise);
  const task = render().refresh(); render().replaceData('saved'); d.resolve('old'); await task;
  assert.equal(render().data, 'saved'); assert.equal(render().loading, false); assert.equal(render().refreshing, false);
});


test('retained hidden tabs do not fetch until active, and stop their listener on hide', async () => {
  const activity = { active: false }; let requests = 0;
  const render = fixture(async () => ++requests, activity);
  render(); assert.equal(render.startEffect(), undefined);
  await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(requests, 0);
  activity.active = true; render(); const cleanup = render.startEffect();
  await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(requests, 1);
  cleanup(); activity.active = false; render(); render.startEffect();
  await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(requests, 1);
});
