const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const file = path.resolve('src/lib/themeColors.ts'), moduleFixture = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
vm.runInNewContext(source, { module: moduleFixture, exports: moduleFixture.exports, require: createRequire(file) });
const { parseThemePreference, resolveTheme, themePalettes } = moduleFixture.exports;
test('new or invalid preferences default to light even on a dark device', () => {
  for (const value of [null, undefined, '', 'invalid', 'LIGHT', false]) assert.equal(resolveTheme(parseThemePreference(value), 'dark'), 'light');
});
test('explicit choices override the device while system choice follows it', () => {
  assert.equal(resolveTheme('light', 'dark'), 'light');
  assert.equal(resolveTheme('dark', 'light'), 'dark');
  assert.equal(resolveTheme('system', 'dark'), 'dark');
  assert.equal(resolveTheme('system', 'light'), 'light');
  assert.equal(resolveTheme('system', null), 'light');
});
function luminance(hex) {
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
test('body, secondary, action and primary-button text retain readable contrast in both modes', () => {
  for (const [mode,c] of Object.entries(themePalettes)) {
    for (const background of [c.canvas,c.surface]) for (const foreground of [c.text,c.muted,c.accent,c.negative,c.danger]) {
      assert.ok(contrast(foreground,background)>=4.5, `${mode}: ${foreground} on ${background}`);
    }
    assert.equal(c.actionText, '#17202E', `${mode}: controls use dark labels`);
    assert.ok(contrast(c.actionText,c.actionBackground)>=4.5, `${mode}: action and selected control label`);
  }
});
