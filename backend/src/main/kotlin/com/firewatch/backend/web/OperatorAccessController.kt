package com.firewatch.backend.web

import com.firewatch.backend.service.OperatorAccess
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController

@RestController
class OperatorAccessController(private val access: OperatorAccess) {
    @GetMapping("/api/operations/access")
    suspend fun get(
        @RequestHeader("X-Device-Id", required = false) deviceId: String?,
        @RequestHeader("Authorization", required = false) authorization: String?,
        @RequestHeader("X-API-Key", required = false) apiKey: String?,
    ) = withContext(Dispatchers.IO) {
        access.requireOperator(deviceId, authorization, apiKey)
        mapOf("operator" to true)
    }
}
