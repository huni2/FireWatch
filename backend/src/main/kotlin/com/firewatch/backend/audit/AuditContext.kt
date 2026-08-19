package com.firewatch.backend.audit

/**
 * Design Ref: §2.2 — FALLBACK은 예외도 아니고 단순 지연도 아닌 "비즈니스 판단"이라 AOP가
 * 자동으로 알 수 없다. Service 메서드가 FALLBACK 경로를 탔을 때 이 함수를 호출해 알리면,
 * [AuditLogAspect]가 (예외 없이 정상 반환됐더라도) status를 FALLBACK으로 기록한다.
 * ThreadLocal이므로 이 메서드를 호출한 스레드 안에서 같은 요청이 끝나기 전에 Aspect가 소비해야 한다.
 */
object AuditContext {
    private val fallbackReason = ThreadLocal<String?>()

    fun markFallback(reason: String) {
        fallbackReason.set(reason)
    }

    /** Aspect 전용 — 호출 시 값을 읽고 즉시 초기화한다(다음 호출에 새어나가지 않도록). */
    internal fun consumeFallback(): String? {
        val value = fallbackReason.get()
        fallbackReason.remove()
        return value
    }
}
