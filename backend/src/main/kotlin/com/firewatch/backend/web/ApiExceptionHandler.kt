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
    // Missing endpoints/static resources must not be disguised as a database/server failure.
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException::class)
    fun handleHttpStatus(ex: org.springframework.web.server.ResponseStatusException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(ex.statusCode).body(ErrorResponse(ErrorBody(
            if (ex.statusCode.value() == 404) "NOT_FOUND" else "HTTP_ERROR",
            if (ex.statusCode.value() == 404) "요청한 API 또는 페이지가 없습니다." else "요청을 처리할 수 없습니다.",
        )))

    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException::class)
    fun conflict(): ResponseEntity<ErrorResponse> = ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ErrorResponse(ErrorBody("CONFLICT", "데이터가 다른 화면에서 변경되었습니다. 새로고침 후 다시 저장해주세요.")))

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException::class)
    fun integrity(): ResponseEntity<ErrorResponse> = ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ErrorResponse(ErrorBody("CONFLICT", "요청이 다른 변경과 충돌했습니다. 새로고침 후 확인해주세요.")))

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
