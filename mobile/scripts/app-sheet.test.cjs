const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const ts = require('typescript');

function fixture() {
  let closeCalls = 0, restores = 0;
  const module = { exports: {} };
  const sheet = { close: () => closeCalls++, snapToIndex: () => restores++ };
  const source = ts.transpileModule(fs.readFileSync('src/components/AppSheet.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: name => {
    if (name === 'react') return { useRef: () => ({ current: sheet }), useCallback: fn => fn };
    if (name === 'react-native') return { Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' }, ScrollView: 'NativeScrollView', TextInput: 'TextInput', View: 'View' };
    if (name === 'react-native-toast-message') return { __esModule: true, default: 'Toast' };
    if (name === '@/lib/toastConfig') return { toastConfig: {} };
    if (name === 'react-native-gesture-handler') return { GestureHandlerRootView: 'GestureRoot' };
    if (name === '@gorhom/bottom-sheet') return { __esModule: true, default: 'BottomSheet', BottomSheetBackdrop: 'Backdrop', BottomSheetTextInput: 'SheetInput', useBottomSheetTimingConfigs: () => ({}) };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, bottom: 34 }) };
    if (name === '@/lib/theme') return { ThemeSurface: 'Theme', useTheme: () => ({ colors: { surface: '#fff', border: '#ddd', muted: '#aaa' } }) };
    if (name === './ModalHeader') return { ModalHeader: 'Header' };
    return require(name);
  } });
  return { ...module.exports, closeCalls: () => closeCalls, restores: () => restores };
}
function find(node, type) {
  if (!node || typeof node !== 'object') return;
  if (node.type === type) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const result = find(child, type); if (result) return result;
  }
}

test('reading and backdrop taps cannot dismiss a panel; explicit close and Android back can', () => {
  const f = fixture(); let dismissed = 0;
  const modal = f.AppSheet({ open: true, title: '시장 브리핑', close: () => dismissed++, children: 'long briefing' });
  assert.equal(find(modal, 'BottomSheet'), undefined);
  assert.equal(find(modal, 'KeyboardAvoidingView').props.onTouchEnd, undefined);
  assert.equal(dismissed, 0);
  find(modal, 'Header').props.close(); assert.equal(dismissed, 1);
  modal.props.onRequestClose(); assert.equal(dismissed, 2);
});
test('saving disables close and Android back without blocking body scrolling', () => {
  const f = fixture(); let dismissed = 0;
  const modal = f.AppSheet({ open: true, disabled: true, title: '주문', close: () => dismissed++, children: 'form' });
  modal.props.onRequestClose(); find(modal, 'Header').props.close();
  assert.equal(dismissed, 0);
  assert.equal(find(modal, 'Header').props.disabled, true);
});

test('keyboard resizing and long footers keep form content and actions scrollable', () => {
  const f = fixture();
  const modal = f.AppSheet({ open: true, title: '주문', close() {}, height: '90%', footer: '긴 동작 안내', children: '본문' });
  const frame = find(modal, 'KeyboardAvoidingView');
  assert.equal(frame.props.behavior, 'height');
  assert.equal(frame.props.children.props.style.height, '90%');
  const footer = find(modal, 'NativeScrollView');
  assert.equal(footer.props.children, '긴 동작 안내');
  assert.equal(footer.props.style.maxHeight, '40%');
  assert.equal(footer.props.keyboardShouldPersistTaps, 'handled');
  assert.equal(f.AppSheetTextInput, 'TextInput');
  assert.equal(f.AppSheet({ open: false, title: '닫힘', close() {}, children: '비공개' }), null);
});
test('long content uses independent native scrolling and preserves scroll callbacks and bottom padding', () => {
  const f = fixture(), onScroll = () => {}, lastLine = '마지막 안내';
  const body = f.AppSheetScrollView({ children: lastLine, onScroll, contentContainerStyle: { gap: 24 } });
  assert.equal(body.type, 'NativeScrollView');
  assert.equal(body.props.nestedScrollEnabled, true);
  assert.equal(body.props.onScroll, onScroll);
  assert.equal(body.props.children, lastLine);
  assert.equal(body.props.style[0].flex, 1);
  assert.equal(body.props.contentContainerStyle[0].paddingBottom, 48);
});
