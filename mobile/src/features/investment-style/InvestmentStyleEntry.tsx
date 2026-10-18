import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/lib/theme'
import { ActionButton } from '@/components/ActionButton'
import { investmentStyleTitle } from '../../../../shared/investment-style'
export function InvestmentStyleEntry() {
  const { colors: c } = useTheme()
  return <View style={{ gap: 12, padding: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}><Text style={{ color: c.text, fontWeight: '700', fontSize: 18, lineHeight: 26 }}>{investmentStyleTitle}</Text><Text style={{ color: c.muted, lineHeight: 22 }}>10문항 · 약 2분 · 로그인 없이{`\n`}내 상황과 지속하기 편한 관리 방식을 함께 살펴봐요.</Text><ActionButton fullWidth label="내 투자 방식 살펴보기" onPress={() => router.push('/investment-style')} /></View>
}
