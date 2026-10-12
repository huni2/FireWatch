import { useCallback, useRef, type ReactNode } from 'react'
import { Modal, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import BottomSheet, { BottomSheetBackdrop, useBottomSheetTimingConfigs, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
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
  const backdrop = useCallback((props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior={disabled ? 'none' : 'close'} opacity={.35} />, [disabled])
  if (!open) return null
  return <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
    <GestureHandlerRootView style={{ flex: 1 }}><ThemeSurface>
      <BottomSheet ref={sheet} index={0} snapPoints={[height]} topInset={insets.top} enableDynamicSizing={false} animateOnMount animationConfigs={animationConfigs} accessible={false} accessibilityRole="none"
        enablePanDownToClose={!disabled} enableHandlePanningGesture={!disabled} enableContentPanningGesture={false}
        backdropComponent={backdrop} onClose={() => { if (!disabled) close(); else sheet.current?.snapToIndex(0) }} backgroundStyle={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        handleComponent={() => <View accessible accessibilityRole="text" accessibilityLabel="창 손잡이" accessibilityHint="아래로 끌면 닫아요. 오른쪽 닫기 버튼도 사용할 수 있어요." style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center' }}><View style={{ backgroundColor: colors.muted, width: 36, height: 4, borderRadius: 2 }} /></View>}>
        <View style={{ flex: 1, paddingBottom: Math.max(12, insets.bottom) }}>
          <ModalHeader title={title} close={dismiss} disabled={disabled} />
          <View style={{ flex: 1 }}>{children}</View>
          {footer && <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>{footer}</View>}
        </View>
      </BottomSheet>
    </ThemeSurface></GestureHandlerRootView>
  </Modal>
}
