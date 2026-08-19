package com.firewatch.backend.web

import org.springframework.http.HttpStatus

// Design Ref: docs/02-design/features/firewatch.design.md §6 — 에러 응답 포맷
open class ApiException(
    val code: String,
    message: String,
    val httpStatus: HttpStatus,
    val details: Map<String, Any?> = emptyMap(),
) : RuntimeException(message)

class NotFoundException(message: String) : ApiException("NOT_FOUND", message, HttpStatus.NOT_FOUND)

class UnauthorizedException(message: String = "API 키가 올바르지 않습니다.") :
    ApiException("UNAUTHORIZED", message, HttpStatus.UNAUTHORIZED)

class ValidationException(message: String, fieldErrors: Map<String, String>) :
    ApiException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, mapOf("fieldErrors" to fieldErrors))
