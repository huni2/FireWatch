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
    if (name === 'react-native') return { Modal: 'Modal', Platform: { OS: 'android' }, ScrollView: 'NativeScrollView', TextInput: 'TextInput', View: 'View' };
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

test('reading taps cannot dismiss a sheet; explicit close and completed handle drag can', () => {
  const f = fixture(); let dismissed = 0;
  const modal = f.AppSheet({ open: true, title: '시장 브리핑', close: () => dismissed++, children: 'long briefing' });
  const sheet = find(modal, 'BottomSheet');
  const backdrop = sheet.props.backdropComponent({});
  assert.equal(backdrop.props.pressBehavior, 'none');
  assert.equal(sheet.props.enableContentPanningGesture, false);
  assert.deepEqual(Array.from(sheet.props.activeOffsetY), [-16, 16]);
  assert.equal(f.closeCalls(), 0);
  find(modal, 'Header').props.close(); assert.equal(f.closeCalls(), 1);
  sheet.props.onClose(); assert.equal(dismissed, 1);
});
test('saving disables close, Android back, and handle dismissal without blocking body scrolling', () => {
  const f = fixture(); let dismissed = 0;
  const modal = f.AppSheet({ open: true, disabled: true, title: '주문', close: () => dismissed++, children: 'form' });
  const sheet = find(modal, 'BottomSheet');
  assert.equal(sheet.props.enablePanDownToClose, false);
  assert.equal(sheet.props.enableHandlePanningGesture, false);
  modal.props.onRequestClose(); find(modal, 'Header').props.close();
  assert.equal(f.closeCalls(), 0);
  sheet.props.onClose(); assert.equal(dismissed, 0); assert.equal(f.restores(), 1);
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
