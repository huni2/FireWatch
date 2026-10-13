package com.firewatch.backend.service

import com.firewatch.backend.audit.AuditedComponent
import com.firewatch.backend.client.GoogleIdentityVerifier
import com.firewatch.backend.entity.AppUser
import com.firewatch.backend.entity.AuditEventType
import com.firewatch.backend.entity.DeviceLink
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.repository.AppUserRepository
import com.firewatch.backend.repository.DeviceLinkRepository
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.web.NotFoundException
import com.firewatch.backend.web.UnauthorizedException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import com.firewatch.backend.repository.PortfolioRepository
import com.firewatch.backend.repository.PortfolioRevisionRepository

/**
 * Design Ref: 공개 배포 전환(2026-09) — 기기별 익명 저장이 기본이고, 이 서비스는 사용자가 설정
 * 화면에서 "Google 계정 연동"을 선택했을 때만 호출된다. ADR 0020부터 연동된 개인 데이터는
 * device_links와 일치하는 기기별 Bearer 세션으로 인증한다.
 *
 * 최초로 이 계정에 연동하는 기기의 기존 설정(관심 종목 등)을 그대로 그 계정의 공유 행으로
 * 승격시킨다 — "연동하면 지금까지 쓰던 게 사라진다"는 걱정을 없애려는 의도(사용자 요청 배경).
 * 이미 다른 기기가 먼저 연동해 공유 행이 있으면(두 번째 이후 기기), 이 기기의 기존 데이터는
 * 유지한 채 계정의 공유 행에 합류한다. 다른 보유·관심 기록은 비교 후 명시적으로 선택한다.
 */
@Service
class AuthService(
    private val googleIdentityVerifier: GoogleIdentityVerifier,
    private val appUserRepository: AppUserRepository,
    private val deviceLinkRepository: DeviceLinkRepository,
    private val userSettingsRepository: UserSettingsRepository,
    private val portfolios: PortfolioRepository? = null,
    private val revisions: PortfolioRevisionRepository? = null,
    private val sessions: com.firewatch.backend.repository.AuthSessions? = null,
    private val accountRecords: AccountRecordLinkService? = null,
) : AuditedComponent {
    override val auditEventType = AuditEventType.AUTH

    @Transactional
    fun renewGoogleSession(deviceId: String, idToken: String, authorizationToken: String?): com.firewatch.backend.repository.LoginSession {
        val identity = googleIdentityVerifier.verify(idToken) ?: throw UnauthorizedException()
        val user = appUserRepository.findByGoogleSub(identity.googleSub) ?: throw UnauthorizedException()
        return requireNotNull(sessions).renew(deviceId, authorizationToken, requireNotNull(user.id))
    }

    @Transactional
    fun linkGoogleAccount(deviceId: String, idToken: String, recordChoice: com.firewatch.backend.web.dto.AccountRecordChoice? = null): UserSettings {
        val identity = googleIdentityVerifier.verify(idToken)
            ?: throw UnauthorizedException("Google 로그인 확인에 실패했습니다.")

        val appUser = appUserRepository.findByGoogleSub(identity.googleSub)
            ?: AppUser(googleSub = identity.googleSub, email = identity.email)
        appUser.email = identity.email
        appUser.emailVerified = identity.emailVerified
        val userId = appUserRepository.save(appUser).id ?: error("저장된 AppUser에 id가 없음")
        val linked = deviceLinkRepository.findById(deviceId).orElse(null)
        if (linked != null && linked.userId != userId) throw UnauthorizedException("현재 연결된 Google 계정으로 로그인해주세요.")
        val anonymous = userSettingsRepository.findByDeviceId(deviceId)
        val existingAccount = userSettingsRepository.findByUserId(userId)
        if (linked == null && anonymous != null && existingAccount != null && anonymous.id != existingAccount.id) {
            accountRecords?.resolve(anonymous, existingAccount, recordChoice)
        }

        val settings = existingAccount
            ?: anonymous?.also {
                it.deviceId = null
                it.userId = userId
            }
            ?: UserSettings(userId = userId)
        val saved = userSettingsRepository.save(settings)

        deviceLinkRepository.save(DeviceLink(deviceId = deviceId, userId = userId))
        return saved
    }

    // Play 스토어 계정 삭제 요건(2026-10-06) — 연동 해제가 아니라 완전 삭제. 이 계정에 연동된
    // 기기가 여럿이어도(동기화 목적으로 여러 기기가 같은 userId를 공유) 전부 한 번에 끊어내고,
    // 공유 설정 행·계정 자체까지 지운다. 기기별 게임(game_sessions 등)은 deviceId로 연결된
    // 서버 자료이며 현재 자동 삭제 범위에 포함되지 않는다. 계정 관련성·별도 삭제 요청 처리는
    // docs/product/privacy-deletion-review/data-processing.md를 따른다. 비개인정보로 단정하지 않는다.
    @Transactional
    fun deleteAccount(deviceId: String) {
        val link = deviceLinkRepository.findById(deviceId).orElse(null)
            ?: throw NotFoundException("연동된 계정이 없습니다.")
        val userId = link.userId
        sessions?.revokeAccount(userId)
        deviceLinkRepository.deleteByUserId(userId)
        userSettingsRepository.findByUserId(userId)?.let {
            revisions?.deleteByOwnerId(it.id)
            portfolios?.deleteById(it.id)
            userSettingsRepository.delete(it)
        }
        appUserRepository.deleteById(userId)
    }

    fun logout(deviceId: String, authorizationToken: String?) { requireNotNull(sessions).logout(deviceId, authorizationToken) }
    fun revokeDevice(deviceId: String, authorizationToken: String?, targetId: String) { requireNotNull(sessions).revokeDevice(deviceId, authorizationToken, targetId) }
}
