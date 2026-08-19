package com.firewatch.backend.web

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.bind.support.WebExchangeBindException

data class ErrorBody(val code: String, val message: String, val details: Map<String, Any?> = emptyMap())
data class ErrorResponse(val error: ErrorBody)

// Design Ref: §6.2 — { "error": { "code", "message", "details" } } 포맷 통일
@RestControllerAdvice
class ApiExceptionHandler {
    private val log = LoggerFactory.getLogger(ApiExceptionHandler::class.java)

    @ExceptionHandler(ApiException::class)
    fun handleApiException(ex: ApiException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(ex.httpStatus)
            .body(ErrorResponse(ErrorBody(ex.code, ex.message ?: ex.code, ex.details)))

    @ExceptionHandler(WebExchangeBindException::class)
    fun handleValidation(ex: WebExchangeBindException): ResponseEntity<ErrorResponse> {
        val fieldErrors = ex.fieldErrors.associate { it.field to (it.defaultMessage ?: "유효하지 않음") }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse(ErrorBody("VALIDATION_ERROR", "입력값이 올바르지 않습니다.", mapOf("fieldErrors" to fieldErrors))),
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception): ResponseEntity<ErrorResponse> {
        // 내부 예외 메시지는 응답에 노출하지 않는다(감사로그에는 이미 AuditLogAspect가 남긴다) — Design §6.1.
        log.error("처리되지 않은 예외", ex)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            ErrorResponse(ErrorBody("INTERNAL_ERROR", "서버 내부 오류가 발생했습니다.")),
        )
    }
}
