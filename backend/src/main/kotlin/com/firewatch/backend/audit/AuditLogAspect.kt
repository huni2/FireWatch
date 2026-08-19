package com.firewatch.backend.audit

import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.AuditLog
import com.firewatch.backend.entity.AuditStatus
import com.firewatch.backend.repository.AuditLogRepository
import org.aspectj.lang.ProceedingJoinPoint
import org.aspectj.lang.annotation.Around
import org.aspectj.lang.annotation.Aspect
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

/**
 * Design Ref: docs/02-design/features/firewatch.design.md §1.2, §2.0 (Option C)
 *
 * `com.firewatch.backend.service` 패키지의 모든 공개 메서드를 가로채 audit_logs에 자동 기록한다.
 * 개별 서비스가 감사로그 호출을 직접 하지 않아도 된다("옵트인이 아니라 옵트아웃").
 *
 * 상태 판정 규칙 (명세서 5.1절):
 *  - 예외 발생 → FAILURE
 *  - 정상 반환 + [AuditContext.markFallback] 호출됨 → FALLBACK
 *  - 정상 반환 + 소요시간이 임계값(기본 3000ms) 초과 → WARNING
 *  - 그 외 → SUCCESS
 */
@Aspect
@Component
class AuditLogAspect(
    private val auditLogRepository: AuditLogRepository,
    @Value("\${firewatch.audit.warning-threshold-ms:3000}") private val warningThresholdMs: Long,
) {
    private val log = LoggerFactory.getLogger(AuditLogAspect::class.java)

    @Around("execution(public * com.firewatch.backend.service..*.*(..))")
    fun auditServiceCall(joinPoint: ProceedingJoinPoint): Any? {
        val target = joinPoint.target
        val declaredEventType = (target as? AuditedComponent)?.auditEventType
        val actionName = "${target.javaClass.simpleName}.${joinPoint.signature.name}"
        val requestPayload = summarizeArgs(joinPoint.args)
        val clientIp = joinPoint.args.filterIsInstance<HasClientIp>().firstOrNull()?.clientIp
        val startedAt = System.currentTimeMillis()

        try {
            val result = joinPoint.proceed()
            val elapsedMs = (System.currentTimeMillis() - startedAt).toInt()
            val fallbackReason = AuditContext.consumeFallback()
            val status = when {
                fallbackReason != null -> AuditStatus.FALLBACK
                elapsedMs > warningThresholdMs -> AuditStatus.WARNING
                else -> AuditStatus.SUCCESS
            }
            persist(
                eventType = declaredEventType ?: AuditEventType.UNCATEGORIZED,
                actionName = actionName,
                status = status,
                elapsedMs = elapsedMs,
                requestPayload = requestPayload,
                responseSummary = fallbackReason ?: "OK",
                clientIp = clientIp,
            )
            return result
        } catch (ex: Exception) {
            val elapsedMs = (System.currentTimeMillis() - startedAt).toInt()
            persist(
                eventType = declaredEventType ?: AuditEventType.ERROR,
                actionName = actionName,
                status = AuditStatus.FAILURE,
                elapsedMs = elapsedMs,
                requestPayload = requestPayload,
                responseSummary = (ex.message ?: ex.javaClass.simpleName).take(MAX_TEXT_LENGTH),
                clientIp = clientIp,
            )
            throw ex
        }
    }

    private fun persist(
        eventType: AuditEventType,
        actionName: String,
        status: AuditStatus,
        elapsedMs: Int,
        requestPayload: String,
        responseSummary: String,
        clientIp: String?,
    ) {
        // 감사로그 저장 실패가 원본 비즈니스 로직을 막아서는 안 된다 — 로그만 남기고 삼킨다.
        try {
            auditLogRepository.save(
                AuditLog(
                    eventType = eventType,
                    actionName = actionName,
                    status = status,
                    executionTimeMs = elapsedMs,
                    requestPayload = requestPayload,
                    responseSummary = responseSummary.take(MAX_TEXT_LENGTH),
                    clientIp = clientIp,
                ),
            )
        } catch (persistEx: Exception) {
            log.error("감사로그 저장 실패 (원본 호출 결과에는 영향 없음): $actionName", persistEx)
        }
    }

    private fun summarizeArgs(args: Array<Any?>): String =
        args.joinToString(prefix = "[", postfix = "]") { it?.toString() ?: "null" }.take(MAX_TEXT_LENGTH)

    companion object {
        private const val MAX_TEXT_LENGTH = 1000
    }
}
