// AI 응답 없이 저장된 지표·뉴스와 자료 시각으로 읽을 수 있는 기본 브리핑을 만든다.
package com.firewatch.backend.entity

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

fun Briefing.basicSummary(news: List<Pair<String, Instant?>>): String = buildString {
    val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.of("Asia/Seoul"))
    appendLine("$briefingDate 기본 시장 브리핑")
    appendLine("AI 해설은 아직 준비되지 않았습니다. 확보한 지표와 기사 제목을 먼저 제공합니다.")
    appendLine("자료 기록 시각: ${formatter.format(createdAt)} KST · 실시간 가격이 아닙니다.")
    appendLine()
    appendLine("시장 지표")
    listOf("금 (USD/oz)" to goldPrice, "은 (USD/oz)" to silverPrice, "원/달러" to usdKrw,
        "원/엔 (100엔)" to jpy100Krw, "원/위안" to cnyKrw, "코스피" to kospi, "코스닥" to kosdaq,
        "S&P500" to sp500, "나스닥" to nasdaq, "다우" to dow,
        "미국채 10년 (%)" to usBondYield10y, "한국국채 10년 (%)" to krBondYield10y).forEach { (label, value) ->
        appendLine("- $label: ${value?.takeIf { it.signum() > 0 }?.toPlainString() ?: "자료 미확보"}")
    }
    appendLine()
    appendLine("보관 뉴스 · 원문은 아래 기사 목록에서 확인하세요.")
    if (news.isEmpty()) appendLine("현재 확보한 뉴스가 없습니다.")
    news.take(8).forEach { (title, publishedAt) ->
        appendLine("- ${title.replace(Regex("[\\r\\n]+"), " ").take(200)} · ${publishedAt?.let(formatter::format) ?: "발행 시각 미확인"}")
    }
    append("AI 추천은 제공하지 않습니다. 자료가 없는 항목을 추정해 채우지 않습니다.")
}.trim()
