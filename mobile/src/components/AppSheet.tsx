import { useCallback, useRef, type ComponentProps, type ReactNode } from 'react'
import { Modal, Platform, ScrollView, TextInput, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, useBottomSheetTimingConfigs, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemeSurface, useTheme } from '@/lib/theme'
import { ModalHeader } from './ModalHeader'

// Drag the handle to dismiss; reading gestures belong to the scrollable body.
export function AppSheet({ open, title, close, disabled = false, height = '85%', footer, children }: {
  open: boolean; title: string; close(): void; disabled?: boolean; height?: string; footer?: ReactNode; children: ReactNode
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const sheet = useRef<BottomSheet>(null)
  const animationConfigs = useBottomSheetTimingConfigs({ duration: 250 })
  const dismiss = () => { if (!disabled) sheet.current?.close() }
  // A reading sheet must not disappear when a tap lands on its backdrop.
  const backdrop = useCallback((props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="none" accessible={false} opacity={.35} />, [])
  if (!open) return null
  return <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
    <GestureHandlerRootView style={{ flex: 1 }}><ThemeSurface>
      <BottomSheet ref={sheet} index={0} snapPoints={[height]} topInset={insets.top} enableDynamicSizing={false} animateOnMount animationConfigs={animationConfigs} accessible={false} accessibilityRole="none"
        keyboardBehavior="interactive" keyboardBlurBehavior="restore" android_keyboardInputMode="adjustResize" enableBlurKeyboardOnGesture
        enablePanDownToClose={!disabled} enableHandlePanningGesture={!disabled} enableContentPanningGesture={false}
        activeOffsetY={[-16, 16]} enableOverDrag={false}
        backdropComponent={backdrop} onClose={() => { if (!disabled) close(); else sheet.current?.snapToIndex(0) }} backgroundStyle={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleComponent={() => <View accessible accessibilityRole="text" accessibilityLabel="창 손잡이" accessibilityHint="아래로 끌면 닫아요. 오른쪽 닫기 버튼도 사용할 수 있어요." style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center' }}><View style={{ backgroundColor: colors.muted, width: 36, height: 4, borderRadius: 2 }} /></View>}>
        <View collapsable={false} style={{ flex: 1, minHeight: 0, backgroundColor: colors.surface, paddingBottom: Math.max(12, insets.bottom) }}>
          <ModalHeader title={title} close={dismiss} disabled={disabled} />
          <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
          {footer && <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>{footer}</View>}
        </View>
      </BottomSheet>
    </ThemeSurface></GestureHandlerRootView>
  </Modal>
}

// Every sheet body owns a bounded scrolling area; headers and footers stay outside it.
// Only the handle moves the sheet. Use a native scroll view so body scrolling
// does not depend on the sheet's animated scroll-lock/gesture registration.
export function AppSheetScrollView({ style, contentContainerStyle, ...props }: ComponentProps<typeof ScrollView>) {
  return <ScrollView {...props} style={[{ flex: 1, minHeight: 0 }, style]} nestedScrollEnabled keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator keyboardDismissMode="on-drag"
    contentContainerStyle={[{ padding: 20, gap: 20, paddingBottom: 48 }, contentContainerStyle]} />
}

// The native input registers keyboard focus with the sheet; RN web lacks its focus API.
export const AppSheetTextInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput
