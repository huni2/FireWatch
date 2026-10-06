package com.firewatch.backend.web

// X-Device-Id는 이제 공개 배포된 앱의 모든 설정 API가 "누구의 행인지" 식별하는 데 쓰인다
// (SettingsController·AuthController 공용) — 없으면 400으로 명확히 거부한다.
fun String?.requireDeviceId(): String {
    if (isNullOrBlank()) {
        throw ValidationException("X-Device-Id 헤더가 필요합니다.", mapOf("deviceId" to "누락됨"))
    }
    if (this == "legacy-owner-device") throw UnauthorizedException("기존 공개 기기 ID는 사용할 수 없습니다. 기기 등록을 다시 진행해주세요.")
    if (length > 64 || !Regex("^[A-Za-z0-9-]+$").matches(this)) {
        throw ValidationException("기기 ID 형식이 올바르지 않습니다.", mapOf("deviceId" to "유효하지 않음"))
    }
    return this
}
