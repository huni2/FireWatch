package com.firewatch.backend.web.dto

import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.WebPushSubscription
import com.firewatch.backend.entity.interestKeywords
import com.firewatch.backend.entity.watchedStocks
import com.firewatch.backend.entity.webPushSubscriptions
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.Instant

// Design Ref: §4.2 PUT /api/settings 요청/응답, §5.4 최대 20개 키워드
data class SettingsUpdateRequest(
    @field:Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "HH:mm 형식이어야 합니다")
    val pushTime: String? = null,
    @field:Size(max = 20, message = "관심 키워드는 최대 20개까지입니다")
    val interestKeywords: List<@Size(max = 30, message = "키워드는 30자를 넘을 수 없습니다") String>? = null,
    // 개별 티커 형식(정규식) 검증은 여기 애노테이션이 아니라 SettingsService.update()에서 직접 한다 —
    // Kotlin의 `List<@Pattern String>` 타입-인자 애노테이션은 Jakarta Bean Validation이 실제로 검증하지
    // 않는 걸 실측 확인했다(2026-08-21, 프로덕션에 유효하지 않은 값이 그대로 저장됨).
    @field:Size(max = 20, message = "관심 종목은 최대 20개까지입니다")
    val watchedStocks: List<@Size(max = 20, message = "종목 티커는 20자를 넘을 수 없습니다") String>? = null,
    // mobile-app Design §3.2 — 모바일 앱 시작 시 FCM 토큰을 등록/갱신하는 용도. 있으면 기존
    // fcm_tokens 목록에 병합(중복 제거)만 하고, pushTime/keywords/watchedStocks는 그대로 둔다.
    @field:Size(max = 512, message = "FCM 토큰 형식이 올바르지 않습니다")
    val fcmToken: String? = null,
    // 웹 푸시 확장 — 브라우저 PushSubscription.toJSON()을 그대로 넘긴다. 있으면 기존 구독 목록에
    // 병합(endpoint 기준 중복 제거)만 하고, 나머지 필드는 fcmToken과 동일한 원칙(그대로 둠).
    val webPushSubscription: WebPushSubscription? = null,
)

data class SettingsResponse(
    val pushTime: String,
    val interestKeywords: List<String>,
    val watchedStocks: List<String>,
    val webPushSubscribed: Boolean,
    val updatedAt: Instant,
    // Google 계정에 연동된 행이면 그 이메일, 아니면 null — 2026-10-06 추가. 이전엔 연동 여부를
    // 클라이언트가 전혀 알 수 없어(모바일 GoogleLinkButton이 로컬 state로만 추적) 앱을 재실행하면
    // 매번 "연동 안 됨"으로 보였다 — 이 필드로 서버 상태를 그대로 반영하게 한다(Play 계정 삭제
    // 요건 대응으로 "연동 해제/계정 삭제" UI를 만들려면 서버가 확인한 연동 상태가 먼저 필요했다).
    val linkedEmail: String? = null,
    val session: com.firewatch.backend.repository.LoginSession? = null,
)

fun UserSettings.toResponse(linkedEmail: String? = null) = SettingsResponse(
    pushTime = pushTime,
    interestKeywords = interestKeywords(),
    watchedStocks = watchedStocks(),
    webPushSubscribed = webPushSubscriptions().isNotEmpty(),
    updatedAt = updatedAt,
    linkedEmail = linkedEmail,
)
