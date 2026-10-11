// 작은 앱 아이콘과 시작 화면에서 읽히는 FireWatch 불꽃 브랜드 심볼이다.
import Svg, { Circle, Path } from 'react-native-svg'
import { firewatchBrand } from '../../../shared/firewatch-brand'

export function FirewatchBrand({ size = 64 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false} importantForAccessibility="no-hide-descendants">
    <Path d={firewatchBrand.flamePath} fill={firewatchBrand.accent} />
    <Circle cx={17} cy={23} r={3} fill="white" />
  </Svg>
}
