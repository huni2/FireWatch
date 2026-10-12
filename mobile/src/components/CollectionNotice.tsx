import { useTheme } from '@/lib/theme'
import { Text, View } from 'react-native'
import { request } from '../lib/api'
import { useResource } from '../lib/useResource'
import { collectionNames, type CollectionAlert } from '../../../shared/collection'
import { getDeviceId } from '../lib/deviceId'

const fetchAlerts = async () => request<CollectionAlert[]>('/api/collection/alerts', { headers: { 'X-Device-Id': await getDeviceId() } })
export function CollectionNotice() {
  const { colors } = useTheme()
  const { data } = useResource(fetchAlerts)
  if (!Array.isArray(data) || !data.length) return null
  return <View accessibilityRole="alert" style={{ padding: 12, margin: 12, borderRadius: 12, backgroundColor: colors.surface }}>
    <Text style={{ fontWeight: '700', color: colors.text }}>운영 장애</Text>
    {data.map(alert => <Text key={alert.id} style={{ color: colors.text }}>{collectionNames[alert.category]} · {alert.message}</Text>)}
    <Text style={{ color: colors.text }}>마지막 정상 데이터는 유지됩니다.</Text>
  </View>
}
