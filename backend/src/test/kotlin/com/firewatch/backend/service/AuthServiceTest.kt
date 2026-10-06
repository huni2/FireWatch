package com.firewatch.backend.service

import com.firewatch.backend.client.GoogleIdentity
import com.firewatch.backend.client.GoogleIdentityVerifier
import com.firewatch.backend.entity.AppUser
import com.firewatch.backend.entity.DeviceLink
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.repository.AppUserRepository
import com.firewatch.backend.repository.DeviceLinkRepository
import com.firewatch.backend.repository.UserSettingsRepository
import com.firewatch.backend.web.NotFoundException
import com.firewatch.backend.web.UnauthorizedException
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

// Design Ref: 공개 배포 전환(2026-09) — "연동하면 지금까지 쓰던 설정이 사라지지 않는다"가 핵심 요구사항.
class AuthServiceTest {

    private val verifier = mockk<GoogleIdentityVerifier>()
    private val appUserRepository = mockk<AppUserRepository>(relaxed = true)
    private val deviceLinkRepository = mockk<DeviceLinkRepository>(relaxed = true)
    private val userSettingsRepository = mockk<UserSettingsRepository>(relaxed = true)
    private val authService = AuthService(verifier, appUserRepository, deviceLinkRepository, userSettingsRepository)

    @Test
    fun `토큰이 유효하지 않으면 UnauthorizedException을 던진다`() {
        every { verifier.verify("bad-token") } returns null

        assertFailsWith<UnauthorizedException> { authService.linkGoogleAccount("device-1", "bad-token") }

        verify(exactly = 0) { appUserRepository.save(any()) }
    }

    @Test
    fun `처음 연동하는 기기면 그 기기의 기존 설정을 계정 행으로 승격한다`() {
        every { verifier.verify("token") } returns GoogleIdentity("google-sub-1", "user@example.com")
        every { appUserRepository.findByGoogleSub("google-sub-1") } returns null
        val savedUser = slot<AppUser>()
        every { appUserRepository.save(capture(savedUser)) } answers { savedUser.captured.also { it.id = 42L } }
        every { userSettingsRepository.findByUserId(42L) } returns null
        val existingDeviceSettings = UserSettings(deviceId = "device-1", watchedStocksRaw = "005930.KS")
        every { userSettingsRepository.findByDeviceId("device-1") } returns existingDeviceSettings
        every { userSettingsRepository.save(existingDeviceSettings) } returns existingDeviceSettings

        val savedLink = slot<DeviceLink>()
        every { deviceLinkRepository.save(capture(savedLink)) } answers { savedLink.captured }

        val result = authService.linkGoogleAccount("device-1", "token")

        assertEquals(42L, result.userId)
        assertNull(result.deviceId)
        assertEquals("005930.KS", result.watchedStocksRaw)
        assertEquals("device-1", savedLink.captured.deviceId)
        assertEquals(42L, savedLink.captured.userId)
    }

    @Test
    fun `이미 다른 기기가 연동해둔 계정이면 그 공유 행을 그대로 쓴다`() {
        every { verifier.verify("token") } returns GoogleIdentity("google-sub-1", "user@example.com")
        val existingUser = AppUser(id = 42L, googleSub = "google-sub-1")
        every { appUserRepository.findByGoogleSub("google-sub-1") } returns existingUser
        val sharedSettings = UserSettings(userId = 42L, watchedStocksRaw = "AAPL")
        every { userSettingsRepository.findByUserId(42L) } returns sharedSettings
        // 제네릭 save(S): S 브리지 메서드는 relaxed mock의 자동 답변이 캐스팅에 실패해 명시 스텁이 필요하다.
        every { userSettingsRepository.save(sharedSettings) } returns sharedSettings
        val savedLink = slot<DeviceLink>()
        every { deviceLinkRepository.save(capture(savedLink)) } answers { savedLink.captured }

        val result = authService.linkGoogleAccount("device-2", "token")

        assertEquals("AAPL", result.watchedStocksRaw)
        verify(exactly = 1) { userSettingsRepository.findByDeviceId("device-2") }
        assertEquals("device-2", savedLink.captured.deviceId)
        assertEquals(42L, savedLink.captured.userId)
    }

    @Test
    fun `계정을 삭제하면 연동된 기기 전부·공유 설정·계정 자체가 지워진다`() {
        every { deviceLinkRepository.findById("device-1") } returns Optional.of(DeviceLink(deviceId = "device-1", userId = 42L))
        val sharedSettings = UserSettings(userId = 42L)
        every { userSettingsRepository.findByUserId(42L) } returns sharedSettings

        authService.deleteAccount("device-1")

        verify { deviceLinkRepository.deleteByUserId(42L) }
        verify { userSettingsRepository.delete(sharedSettings) }
        verify { appUserRepository.deleteById(42L) }
    }

    @Test
    fun `연동된 계정이 없으면 삭제 시 NotFoundException`() {
        every { deviceLinkRepository.findById("device-1") } returns Optional.empty()

        assertFailsWith<NotFoundException> { authService.deleteAccount("device-1") }
    }
}
