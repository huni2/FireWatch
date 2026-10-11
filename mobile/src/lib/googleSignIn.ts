import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Load only when requested: a missing native module must not prevent app startup.
export async function googleIdToken(): Promise<string | null> {
  if (Platform.OS !== 'android') throw new Error('Google 계정 연결은 Android 설치 앱에서 이용해주세요.')
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || Constants.expoConfig?.extra?.googleWebClientId
  if (!webClientId) throw new Error('로그인 설정이 빠져 있어요. 업데이트된 앱에서 다시 시도해주세요.')
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await import('@react-native-google-signin/google-signin')
  try {
    GoogleSignin.configure({ webClientId, offlineAccess: false })
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()
    if (!isSuccessResponse(response)) return null
    if (!response.data.idToken) throw new Error('Google 계정을 확인하지 못했어요. 잠시 후 다시 시도해주세요.')
    return response.data.idToken
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play 서비스를 업데이트한 뒤 다시 시도해주세요.')
      if (error.code === '10' || error.code === 'DEVELOPER_ERROR') throw new Error('앱 로그인 설정을 확인해야 해요. 고객 문의에 로그인 오류 10을 알려주세요.')
    }
    throw error
  }
}
