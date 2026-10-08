// 웹과 같은 벡터 원본으로 FireWatch 전용 앱 메뉴 아이콘을 표시한다.
import Svg, { Path } from 'react-native-svg'
import { firewatchIcons, type FirewatchIconName } from '../../../shared/firewatch-icons'
import tokens from '../../../shared/design-tokens.json'

export function FirewatchIcon({ name, size = 24, color = tokens.light.text, monochrome = false }: { name: FirewatchIconName; size?: number; color?: string; monochrome?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {firewatchIcons[name].map((shape, index) => <Path key={index} d={shape.d} transform={shape.transform} fill={shape.solid ? monochrome ? color : tokens.light.accent : 'none'} stroke={shape.solid ? 'none' : shape.accent && !monochrome ? tokens.light.accent : color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />)}
  </Svg>
}
