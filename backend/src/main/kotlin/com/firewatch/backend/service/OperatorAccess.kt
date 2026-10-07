package com.firewatch.backend.service

import com.firewatch.backend.repository.AppUserRepository
import com.firewatch.backend.repository.AuthSessions
import com.firewatch.backend.web.ForbiddenException
import com.firewatch.backend.web.UnauthorizedException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.security.MessageDigest

@Service
class OperatorAccess(
    private val sessions: AuthSessions,
    private val users: AppUserRepository,
    @Value("\${firewatch.operator.email}") private val operatorEmail: String,
    @Value("\${firewatch.operator.api-key}") private val managementKey: String,
) {
    fun requireOperator(deviceId: String?, authorization: String?, apiKey: String?) {
        // This separate server-only secret must never be included in client builds.
        if (!apiKey.isNullOrBlank()) {
            if (managementKey.isNotBlank() && MessageDigest.isEqual(apiKey.toByteArray(), managementKey.toByteArray())) return
            throw UnauthorizedException()
        }
        if (deviceId.isNullOrBlank()) throw UnauthorizedException("운영자 인증이 필요합니다.")
        val user = users.findById(sessions.authenticate(deviceId, authorization)).orElse(null)
        if (user?.emailVerified != true || operatorEmail.isBlank() || !operatorEmail.equals(user.email, ignoreCase = true))
            throw ForbiddenException()
    }
}
