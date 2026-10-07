const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function validate(config, env, readFile) {
  const errors = [];
  try {
    const url = new URL(env.EXPO_PUBLIC_API_BASE_URL);
    if (url.protocol !== 'https:' || url.username || url.password ||
        /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname) || url.search || url.hash) {
      errors.push('운영 API 주소는 인증정보 없는 공개 HTTPS 주소여야 합니다.');
    }
  } catch {
    errors.push('EXPO_PUBLIC_API_BASE_URL을 설정하세요.');
  }
  if (!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '')) {
    errors.push('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID에 Android 공개 OAuth ID를 설정하세요.');
  }
  if (!config.android?.package || !Number.isInteger(config.android.versionCode) || config.android.versionCode < 1) {
    errors.push('Android 패키지와 양의 정수 versionCode가 필요합니다.');
  }
  if (!config.extra?.eas?.projectId) errors.push('EAS projectId가 필요합니다.');
  const exposedSecrets = Object.keys(env).filter(name =>
    /^EXPO_PUBLIC_.*(OPERATOR_API_KEY|PRIVATE_KEY|CLIENT_SECRET|SERVICE_ACCOUNT|GEMINI_API_KEY)$/.test(name));
  if (exposedSecrets.length) errors.push('서버 비밀 키를 EXPO_PUBLIC_ 환경변수에 넣을 수 없습니다.');
  const file = env.GOOGLE_SERVICES_JSON || './google-services.json';
  try {
    const firebase = JSON.parse(readFile(file));
    if (!firebase.project_info?.project_id || !firebase.client?.some(client =>
      client.client_info?.android_client_info?.package_name === config.android?.package)) {
      errors.push('Firebase 설정의 Android 패키지가 앱과 일치해야 합니다.');
    }
  } catch {
    errors.push('푸시용 google-services.json 또는 EAS 파일 변수 GOOGLE_SERVICES_JSON이 필요합니다.');
  }
  return errors;
}

if (require.main === module) {
  // This hook runs after dependency installation; Expo applies its normal .env precedence.
  require('@expo/env').load(root, { silent: true });
  const profile = process.env.EAS_BUILD_PROFILE;
  if (process.argv.includes('--eas') && profile === 'development') {
    console.log('개발 클라이언트: 출시 설정 검사는 npm run release:check로 별도 실행하세요.');
  } else if (process.argv.includes('--eas') && process.env.EAS_BUILD_PLATFORM !== 'android') {
    console.log('Android 출시 검사: 다른 플랫폼은 건너뜁니다.');
  } else {
    const config = require('../app.json').expo;
    const errors = validate(config, process.env, file => fs.readFileSync(path.resolve(root, file), 'utf8'));
    for (const error of errors) console.error(`FAIL: ${error}`);
    if (errors.length) process.exitCode = 1;
    else console.log('Android 설정 검사 통과. 서명 SHA-1·EAS FCM 자격증명·실기기 로그인/수신 검증은 별도입니다.');
  }
}

module.exports = { validate };
