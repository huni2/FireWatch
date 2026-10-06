import tokens from '../../../shared/design-tokens.json'
// 웹(theme.ts BRAND_GREEN)과 동일한 브랜드 그린으로 성공 토스트만 맞춘 설정 — 에러는 라이브러리 기본색 유지.
import { BaseToast, type ToastConfig } from 'react-native-toast-message'

const BRAND_ACCENT = tokens.light.accent

export const toastConfig: ToastConfig = {
  success: (props) => <BaseToast {...props} style={{ borderLeftColor: BRAND_ACCENT }} />,
}
