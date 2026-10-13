const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
function compile(file, requireModule) {
  const fixture = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { module: fixture, exports: fixture.exports, require: requireModule });
  return fixture.exports;
}
const themeFile = path.resolve('src/lib/themeColors.ts');
const { themePalettes } = compile(themeFile, createRequire(themeFile));
let colors;
const { ActionButton } = compile('src/components/ActionButton.tsx', name => name === '@/lib/theme' ? { useTheme: () => ({ colors }) } : name === 'react-native' ? { Pressable: 'Pressable', Text: 'Text', View: 'View', ActivityIndicator: 'ActivityIndicator' } : require(name));
function luminance(hex) {
  const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
}
function ratio(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
for (const mode of ['light','dark']) for (const tone of ['primary','next','secondary']) for (const state of ['ready','disabled','busy']) {
  test(`${mode} ${tone} ${state}: rendered label and spinner match the button background`, () => {
    colors = themePalettes[mode];
    const button = ActionButton({ label: '거래 금액 확인', onPress() {}, tone, disabled: state !== 'ready', busy: state === 'busy' });
    const background = button.props.style.backgroundColor;
    const [slot,label] = button.props.children;
    assert.ok(ratio(label.props.style.color,background)>=4.5);
    assert.equal(button.props.accessibilityState.disabled, state !== 'ready');
    if (tone !== 'secondary' && state !== 'disabled') {
      assert.equal(label.props.style.color, '#17202E');
      assert.equal(background, colors.actionBackground);
    }
    if (state === 'busy') assert.equal(slot.props.children.props.color, label.props.style.color);
  });
}
