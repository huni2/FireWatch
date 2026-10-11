// 웹과 같은 벡터 원본으로 FireWatch 전용 앱 메뉴 아이콘을 표시한다.
import Svg, { Path } from 'react-native-svg'
import { firewatchIcons, type FirewatchIconName } from '../../../shared/firewatch-icons'
import { useTheme } from '@/lib/theme'

export function FirewatchIcon({ name, size = 24, color: providedColor, monochrome = false }: { name: FirewatchIconName; size?: number; color?: string; monochrome?: boolean }) {
  const { colors } = useTheme()
  const color = providedColor ?? colors.text
  return <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {firewatchIcons[name].map((shape, index) => <Path key={index} d={shape.d} transform={shape.transform} fill={shape.solid ? monochrome ? color : colors.accent : 'none'} stroke={shape.solid ? 'none' : shape.accent && !monochrome ? colors.accent : color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />)}
  </Svg>
}
