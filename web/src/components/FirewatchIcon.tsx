// FireWatch의 공유 벡터를 테마에 맞는 장식용 웹 메뉴 아이콘으로 표시한다.
import { firewatchIcons, type FirewatchIconName } from '../../../shared/firewatch-icons'

export function FirewatchIcon({ name, size = 24, monochrome = false }: { name: FirewatchIconName; size?: number; monochrome?: boolean }) {
  return <svg className="firewatch-icon" data-firewatch-icon={name} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
    {firewatchIcons[name].map((shape, index) => <path key={index} d={shape.d} transform={shape.transform} fill={shape.solid ? monochrome ? 'currentColor' : 'var(--ant-color-primary)' : 'none'} stroke={shape.solid ? 'none' : shape.accent && !monochrome ? 'var(--ant-color-primary)' : 'currentColor'} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>
}
