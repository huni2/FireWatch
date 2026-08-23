import { Link } from 'expo-router'
import { Text, View } from 'react-native'

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="text-2xl font-bold text-brand">🔥 FireWatch</Text>
      <Text className="text-center text-base text-neutral-500">
        오늘의 브리핑 화면은 APP-3에서 채워집니다.
      </Text>
      <Link href="/settings" className="text-base font-semibold text-brand">
        설정으로 이동
      </Link>
    </View>
  )
}
