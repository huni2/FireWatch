package com.firewatch.backend.entity

import tools.jackson.databind.json.JsonMapper
import tools.jackson.module.kotlin.KotlinModule
import tools.jackson.module.kotlin.readValue

// 웹 브라우저의 PushSubscription을 그대로 옮긴 형태 — FCM 토큰(단순 문자열)과 달리 endpoint+keys로
// 구조화돼 있어 fcm_tokens처럼 쉼표 문자열로 못 담고 JSON 배열로 저장한다.
data class WebPushSubscription(
    val endpoint: String,
    val keys: WebPushKeys,
)

data class WebPushKeys(
    val p256dh: String,
    val auth: String,
)

private val webPushJsonMapper = JsonMapper.builder().addModule(KotlinModule.Builder().build()).build()

fun String?.toWebPushSubscriptions(): List<WebPushSubscription> =
    if (this.isNullOrBlank()) emptyList() else webPushJsonMapper.readValue(this)

fun List<WebPushSubscription>.toJsonString(): String = webPushJsonMapper.writeValueAsString(this)
