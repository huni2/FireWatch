import { Text, View } from 'react-native'
import { request } from '../lib/api'
import { useResource } from '../lib/useResource'
import { collectionNames, type CollectionAlert } from '../../../shared/collection'
import tokens from '../../../shared/design-tokens.json'
import { getDeviceId } from '../lib/deviceId'

const fetchAlerts = async () => request<CollectionAlert[]>('/api/collection/alerts', { headers: { 'X-Device-Id': await getDeviceId() } })
export function CollectionNotice() {
  const { data } = useResource(fetchAlerts)
  if (!Array.isArray(data) || !data.length) return null
  return <View accessibilityRole="alert" style={{ padding: 12, margin: 12, borderRadius: 12, backgroundColor: tokens.light.surface }}>
    <Text style={{ fontWeight: '700', color: tokens.light.text }}>운영 장애</Text>
    {data.map(alert => <Text key={alert.id} style={{ color: tokens.light.text }}>{collectionNames[alert.category]} · {alert.message}</Text>)}
    <Text style={{ color: tokens.light.text }}>마지막 정상 데이터는 유지됩니다.</Text>
  </View>
}
