package com.firewatch.backend.client

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

data class GoogleIdentity(val googleSub: String, val email: String?, val emailVerified: Boolean = false)

interface GoogleIdentityVerifier {
    // 유효하지 않은 토큰(서명 불일치·만료·audience 불일치 등)이면 null을 반환한다 — 호출부(AuthService)가
    // UnauthorizedException으로 변환한다.
    fun verify(idToken: String): GoogleIdentity?
}

/**
 * Design Ref: 공개 배포 전환(2026-09) — 모바일 Google 로그인이 발급한 ID 토큰을 서버에서 검증.
 * 서명·만료·audience 검증과 Google 공개키(JWKS) 캐싱·로테이션을 전부 [GoogleIdTokenVerifier](Google 공식
 * 라이브러리)에 위임한다 — 인증에 직결되는 부분을 직접 구현하지 않는다.
 */
@Component
class GoogleIdTokenVerifierClient(
    @Value("\${firewatch.google.oauth-client-ids}") oauthClientIds: String,
) : GoogleIdentityVerifier {
    private val verifier = GoogleIdTokenVerifier.Builder(NetHttpTransport(), GsonFactory.getDefaultInstance())
        .setAudience(oauthClientIds.split(",").map { it.trim() }.filter { it.isNotEmpty() })
        .build()

    override fun verify(idToken: String): GoogleIdentity? {
        val token = verifier.verify(idToken) ?: return null
        return GoogleIdentity(googleSub = token.payload.subject, email = token.payload.email, emailVerified = token.payload.emailVerified == true)
    }
}
