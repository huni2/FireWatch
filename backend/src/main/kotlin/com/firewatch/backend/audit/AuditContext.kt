package com.firewatch.backend.audit

/**
 * Design Ref: §2.2 — FALLBACK은 예외도 아니고 단순 지연도 아닌 "비즈니스 판단"이라 AOP가
 * 자동으로 알 수 없다. Service 메서드가 FALLBACK 경로를 탔을 때 이 함수를 호출해 알리면,
 * [AuditLogAspect]가 (예외 없이 정상 반환됐더라도) status를 FALLBACK으로 기록한다.
 * ThreadLocal이므로 이 메서드를 호출한 스레드 안에서 같은 요청이 끝나기 전에 Aspect가 소비해야 한다.
 */
object AuditContext {
    private val fallbackReason = ThreadLocal<String?>()

    // 같은 스레드 안에서 감사 대상 메서드가 다른 감사 대상 메서드를 호출하는 중첩 호출 깊이.
    // markFallback()은 "지금 실행 중인 가장 바깥쪽 감사 호출"을 위한 표시인데, 중첩 호출이 먼저
    // consumeFallback()을 불러버리면 엉뚱한(중첩된) 호출이 FALLBACK을 가로채간다 — 실측: SchedulerJob이
    // Gemini 실패 후 markFallback을 부르고 나서 NewsService.fetchRelatedNews()를 호출하니 SCHEDULER가 아니라
    // NEWS_API 감사로그에 "Gemini 실패: ..." 사유가 잘못 찍힘(2026-08-21). 가장 바깥쪽 호출만 소비하도록 depth로 방지.
    private val callDepth = ThreadLocal.withInitial { 0 }

    fun markFallback(reason: String) {
        fallbackReason.set(reason)
    }

    /** Aspect 전용 — 호출 시 값을 읽고 즉시 초기화한다(다음 호출에 새어나가지 않도록). */
    internal fun consumeFallback(): String? {
        val value = fallbackReason.get()
        fallbackReason.remove()
        return value
    }

    /** Aspect 전용 — 감사 대상 호출에 진입할 때 부른다. 반환값이 true면 이 호출이 가장 바깥쪽(root)이다. */
    internal fun enterCall(): Boolean {
        val depth = callDepth.get()
        callDepth.set(depth + 1)
        return depth == 0
    }

    /** Aspect 전용 — 감사 대상 호출이 끝날 때(성공/예외 무관) 부른다. */
    internal fun exitCall() {
        val depth = callDepth.get() - 1
        if (depth <= 0) callDepth.remove() else callDepth.set(depth)
    }
}
