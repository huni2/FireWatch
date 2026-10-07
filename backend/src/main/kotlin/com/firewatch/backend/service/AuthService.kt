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
 * 유지한 채 계정의 공유 행에 합류한다. 별도 포트폴리오가 있으면 덮어쓰지 않고 충돌로 중단한다.
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
) : AuditedComponent {
    override val auditEventType = AuditEventType.AUTH

    @Transactional
    fun linkGoogleAccount(deviceId: String, idToken: String): UserSettings {
        val identity = googleIdentityVerifier.verify(idToken)
            ?: throw UnauthorizedException("Google 로그인 확인에 실패했습니다.")

        val appUser = appUserRepository.findByGoogleSub(identity.googleSub)
            ?: appUserRepository.save(AppUser(googleSub = identity.googleSub, email = identity.email))
        val userId = appUser.id ?: error("저장된 AppUser에 id가 없음")
        val linked = deviceLinkRepository.findById(deviceId).orElse(null)
        if (linked != null && linked.userId != userId) throw UnauthorizedException("현재 연결된 Google 계정으로 로그인해주세요.")
        val anonymous = userSettingsRepository.findByDeviceId(deviceId)
        val existingAccount = userSettingsRepository.findByUserId(userId)
        if (anonymous != null && existingAccount != null && anonymous.id != existingAccount.id && portfolios?.existsById(anonymous.id) == true) {
            throw com.firewatch.backend.web.ConflictException("이 기기와 계정의 포트폴리오를 먼저 확인해주세요. 기기 데이터를 덮어쓰지 않도록 연동을 중단했습니다.")
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
    // 공유 설정 행·계정 자체까지 지운다. 기기별 익명 데이터(game_sessions 등)는 deviceId로만
    // 연결돼 있어 계정과 무관하게 남는다 — 의도된 동작(가입 없이도 쓸 수 있던 로컬 데이터라 PII 아님).
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
