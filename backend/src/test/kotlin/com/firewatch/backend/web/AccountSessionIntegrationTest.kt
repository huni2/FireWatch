package com.firewatch.backend.web

import com.firewatch.backend.entity.AppUser
import com.firewatch.backend.entity.DeviceLink
import com.firewatch.backend.entity.UserSettings
import com.firewatch.backend.entity.watchedStocks
import com.firewatch.backend.repository.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.AfterEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import org.springframework.http.client.reactive.JdkClientHttpConnector
import java.net.http.HttpClient
import java.time.Instant
import kotlin.test.*
import com.firewatch.backend.client.GoogleIdentity
import com.firewatch.backend.client.GoogleIdentityVerifier
import com.firewatch.backend.web.dto.PortfolioHoldingInput
import com.firewatch.backend.web.dto.PortfolioUpdateRequest
import com.firewatch.backend.web.dto.PortfolioResponse
import com.firewatch.backend.web.dto.SettingsResponse
import org.mockito.Mockito.`when`
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.math.BigDecimal

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:session-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-", "firewatch.settings.api-key=session-test-key", "firewatch.operator.api-key=operator-test-key"])
class AccountSessionIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @LocalServerPort var port: Int = 0
    @Autowired lateinit var sessions: AuthSessions
    @Autowired lateinit var users: AppUserRepository
    @Autowired lateinit var links: DeviceLinkRepository
    @Autowired lateinit var settings: UserSettingsRepository
    @Autowired lateinit var jdbc: org.springframework.jdbc.core.JdbcTemplate
    @MockitoBean lateinit var google: GoogleIdentityVerifier
    @Autowired lateinit var portfolios: PortfolioRepository
    @Autowired lateinit var revisions: PortfolioRevisionRepository
    private val recordMapper = tools.jackson.databind.json.JsonMapper.builder().findAndAddModules().build()

    private fun recordFixture(key: String, guestHoldings: List<PortfolioHoldingInput>, guestStocks: String? = "005930.KS,035720.KS", accountStocks: String? = "035720.KS,AAPL"): Pair<UserSettings, UserSettings> {
        val user = users.save(AppUser(googleSub = "record-choice-$key", email = "$key@example.test"))
        `when`(google.verify("record-choice-$key-proof")).thenReturn(GoogleIdentity(user.googleSub, user.email, true))
        val guest = settings.save(UserSettings(deviceId = "record-choice-$key-device", watchedStocksRaw = guestStocks))
        val account = settings.save(UserSettings(userId = user.id, watchedStocksRaw = accountStocks))
        portfolios.saveAndFlush(com.firewatch.backend.entity.Portfolio(ownerId = guest.id, holdingsJson = recordMapper.writeValueAsString(guestHoldings)))
        portfolios.saveAndFlush(com.firewatch.backend.entity.Portfolio(ownerId = account.id, goal = "계정 목표", cash = BigDecimal("10000"), holdingsJson = recordMapper.writeValueAsString(listOf(PortfolioHoldingInput("035720.KS", "카카오", BigDecimal("10"), BigDecimal("50000"))))))
        return guest to account
    }
    private fun recordLogin(key: String, choice: com.firewatch.backend.web.dto.AccountRecordChoice? = null) = client().post().uri("/api/auth/google/link")
        .header("X-Device-Id", "record-choice-$key-device").bodyValue(com.firewatch.backend.web.dto.GoogleLinkRequest("record-choice-$key-proof", choice)).exchange()
    private fun comparison(key: String): String {
        val error = recordLogin(key).expectStatus().isEqualTo(409).expectBody(ErrorResponse::class.java).returnResult().responseBody!!.error
        assertEquals("ACCOUNT_RECORD_CHOICE_REQUIRED", error.code)
        return (error.details["comparison"] as Map<*, *>)["fingerprint"] as String
    }
    private fun storedHoldings(owner: Long) = recordMapper.readValue(portfolios.findById(owner).orElseThrow().holdingsJson, Array<PortfolioHoldingInput>::class.java).toList()

    @Test
    fun `빈 보유 기록과 이미 있는 관심 기업은 로그인 차단 없이 계정 기록을 유지한다`() {
        val (guest, account) = recordFixture("empty", emptyList(), "035720.KS", "035720.KS,AAPL")
        val response = recordLogin("empty").expectStatus().isOk.expectBody(SettingsResponse::class.java).returnResult().responseBody!!
        assertNotNull(response.session)
        assertEquals(listOf("035720.KS", "AAPL"), response.watchedStocks)
        assertEquals(BigDecimal("10"), storedHoldings(account.id).single().quantity)
        assertTrue(storedHoldings(guest.id).isEmpty())
    }

    @Test
    fun `관심 기업만 있어도 비교하며 합치면 중복을 하나로 남기고 포트폴리오는 바꾸지 않는다`() {
        val (guest, account) = recordFixture("watch", emptyList())
        val before = portfolios.findById(account.id).orElseThrow().holdingsJson
        val fingerprint = comparison("watch")
        assertFalse(links.existsById(guest.deviceId!!))
        recordLogin("watch", com.firewatch.backend.web.dto.AccountRecordChoice("MERGE_ACCOUNT", "ACCOUNT", fingerprint)).expectStatus().isOk.expectBody(Void::class.java)
        assertEquals(listOf("035720.KS", "AAPL", "005930.KS"), settings.findById(account.id).orElseThrow().watchedStocks())
        assertEquals(before, portfolios.findById(account.id).orElseThrow().holdingsJson)
        assertEquals("005930.KS,035720.KS", settings.findById(guest.id).orElseThrow().watchedStocksRaw)
    }

    @Test
    fun `확인 전에는 쓰지 않고 계정 기록만 선택하면 기기 원본과 계정 모두 보존한다`() {
        val (guest, account) = recordFixture("keep", listOf(PortfolioHoldingInput("035720.KS", "카카오", BigDecimal("2"))))
        val before = portfolios.findById(account.id).orElseThrow().holdingsJson
        val fingerprint = comparison("keep")
        assertFalse(links.existsById(guest.deviceId!!))
        assertEquals(before, portfolios.findById(account.id).orElseThrow().holdingsJson)
        recordLogin("keep", com.firewatch.backend.web.dto.AccountRecordChoice("ACCOUNT", "ACCOUNT", fingerprint)).expectStatus().isOk.expectBody(Void::class.java)
        assertEquals(before, portfolios.findById(account.id).orElseThrow().holdingsJson)
        assertEquals(BigDecimal("2"), storedHoldings(guest.id).single().quantity)
        assertEquals("035720.KS,AAPL", settings.findById(account.id).orElseThrow().watchedStocksRaw)
    }

    @Test
    fun `중복 보유는 선택한 쪽 값으로만 업데이트하며 현금은 더하지 않고 변경 전후 이력을 남긴다`() {
        for (mode in listOf("MERGE_ACCOUNT", "MERGE_DEVICE")) {
            val key = mode.lowercase().replace('_', '-')
            val guestHolding = PortfolioHoldingInput("035720.KS", "카카오", BigDecimal("2"), BigDecimal("40000"))
            val (guest, account) = recordFixture(key, listOf(guestHolding, PortfolioHoldingInput("005930.KS", "삼성전자", BigDecimal("3"))))
            val source = portfolios.findById(guest.id).orElseThrow(); source.cash = BigDecimal("7000"); portfolios.saveAndFlush(source)
            val fingerprint = comparison(key)
            recordLogin(key, com.firewatch.backend.web.dto.AccountRecordChoice(mode, "DEVICE", fingerprint)).expectStatus().isOk.expectBody(Void::class.java)
            val holdings = storedHoldings(account.id)
            assertEquals(2, holdings.size)
            assertEquals(if (mode == "MERGE_DEVICE") BigDecimal("2") else BigDecimal("10"), holdings.single { it.symbol == "035720.KS" }.quantity)
            assertEquals(if (mode == "MERGE_DEVICE") BigDecimal("40000") else BigDecimal("50000"), holdings.single { it.symbol == "035720.KS" }.averageCost)
            assertEquals(0, BigDecimal("7000").compareTo(portfolios.findById(account.id).orElseThrow().cash))
            assertEquals("계정 목표", portfolios.findById(account.id).orElseThrow().goal)
            assertEquals(guestHolding, storedHoldings(guest.id).first())
            assertEquals(2, revisions.findAll().count { it.ownerId == account.id })
            // Retry after linking is idempotent and cannot merge the source twice.
            recordLogin(key, com.firewatch.backend.web.dto.AccountRecordChoice(mode, "DEVICE", fingerprint)).expectStatus().isOk.expectBody(Void::class.java)
            assertEquals(2, revisions.findAll().count { it.ownerId == account.id })
        }
    }

    @Test
    fun `비교 뒤 관심 기업이나 보유 기록이 변경되면 예전 확인으로 연결할 수 없다`() {
        val (guest, account) = recordFixture("stale", listOf(PortfolioHoldingInput("035720.KS", "카카오", BigDecimal("2"))))
        val fingerprint = comparison("stale")
        val changed = settings.findById(account.id).orElseThrow(); changed.watchedStocksRaw = "AAPL"; settings.saveAndFlush(changed)
        recordLogin("stale", com.firewatch.backend.web.dto.AccountRecordChoice("MERGE_DEVICE", "DEVICE", fingerprint)).expectStatus().isEqualTo(409).expectBody(Void::class.java)
        assertFalse(links.existsById(guest.deviceId!!))
        assertEquals(BigDecimal("10"), storedHoldings(account.id).single().quantity)
        val current = comparison("stale")
        assertNotEquals(fingerprint, current)
        val changedPortfolio = portfolios.findById(account.id).orElseThrow(); changedPortfolio.cash = BigDecimal("999"); portfolios.saveAndFlush(changedPortfolio)
        recordLogin("stale", com.firewatch.backend.web.dto.AccountRecordChoice("MERGE_DEVICE", "DEVICE", current)).expectStatus().isEqualTo(409).expectBody(Void::class.java)
        assertFalse(links.existsById(guest.deviceId!!))
    }

    @Test
    fun `합친 기록의 제한이나 계좌 규칙을 위반하면 로그인도 기록 변경도 롤백된다`() {
        val (guest, account) = recordFixture("limit", emptyList(), (1..20).joinToString(",") { "S$it" }, "AAPL")
        val fingerprint = comparison("limit")
        recordLogin("limit", com.firewatch.backend.web.dto.AccountRecordChoice("MERGE_ACCOUNT", "ACCOUNT", fingerprint)).expectStatus().isBadRequest.expectBody(Void::class.java)
        assertFalse(links.existsById(guest.deviceId!!)); assertEquals("AAPL", settings.findById(account.id).orElseThrow().watchedStocksRaw)
        val (guestIsa, accountIsa) = recordFixture("isa", listOf(PortfolioHoldingInput("AAPL", "애플", BigDecimal("1"), currency = "USD", region = "US")))
        val isa = portfolios.findById(accountIsa.id).orElseThrow(); isa.accountType = "ISA"; portfolios.saveAndFlush(isa)
        val isaFingerprint = comparison("isa")
        recordLogin("isa", com.firewatch.backend.web.dto.AccountRecordChoice("MERGE_DEVICE", "ACCOUNT", isaFingerprint)).expectStatus().isBadRequest.expectBody(Void::class.java)
        assertFalse(links.existsById(guestIsa.deviceId!!)); assertEquals(1, storedHoldings(accountIsa.id).size)
    }

    @Test
    fun `현금만 있는 기록도 선택이 필요하고 합친 보유 종목 50개 제한을 우회하지 않는다`() {
        val (cashGuest, cashAccount) = recordFixture("cash-only", emptyList(), null, null)
        val cash = portfolios.findById(cashGuest.id).orElseThrow(); cash.cash = BigDecimal("777"); portfolios.saveAndFlush(cash)
        val fingerprint = comparison("cash-only")
        recordLogin("cash-only", com.firewatch.backend.web.dto.AccountRecordChoice("MERGE_ACCOUNT", "ACCOUNT", fingerprint)).expectStatus().isOk.expectBody(Void::class.java)
        assertEquals(0, BigDecimal("10000").compareTo(portfolios.findById(cashAccount.id).orElseThrow().cash))
        val many = (1..50).map { PortfolioHoldingInput("${100000 + it}.KS", "기업 $it", BigDecimal.ONE) }
        val (guest, account) = recordFixture("many", many, null, null)
        val manyFingerprint = comparison("many")
        recordLogin("many", com.firewatch.backend.web.dto.AccountRecordChoice("MERGE_DEVICE", "ACCOUNT", manyFingerprint)).expectStatus().isBadRequest.expectBody(Void::class.java)
        assertFalse(links.existsById(guest.deviceId!!))
        assertEquals(1, storedHoldings(account.id).size)
        assertEquals(50, storedHoldings(guest.id).size)
    }
    // Keep test traffic off the server's shared Reactor HTTP resources. Reuse one
    // transport per test method and close it explicitly; retain the 20-second limit.
    private val transport = lazy { HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build() }
    private val httpClient by lazy {
        WebTestClient.bindToServer(JdkClientHttpConnector(transport.value))
            .baseUrl("http://127.0.0.1:$port")
            .responseTimeout(java.time.Duration.ofSeconds(20)).build()
    }
    private fun client() = httpClient

    @AfterEach
    fun closeTransport() {
        // Status-only assertions cancel the response body. Do not wait indefinitely
        // for its publisher while disposing a transport whose test is already done.
        if (transport.isInitialized()) transport.value.shutdownNow()
    }

    @Test
    fun `만료 세션은 같은 Google 계정으로만 갱신하고 폐기된 기기와 토큰은 복구하지 않는다`() {
        val user = users.save(AppUser(googleSub = "renew-owner", email = "renew@example.test"))
        val other = users.save(AppUser(googleSub = "renew-other"))
        val device = "renew-device"
        settings.save(UserSettings(userId = user.id, watchedStocksRaw = "AAPL"))
        links.save(DeviceLink(device, user.id!!))
        val expired = sessions.issue(device, Instant.now().minusSeconds(31L * 24 * 3600))
        `when`(google.verify("renew-proof")).thenReturn(GoogleIdentity(user.googleSub, "renew@example.test", true))
        `when`(google.verify("other-proof")).thenReturn(GoogleIdentity(other.googleSub, "other@example.test", true))
        fun renew(token: String, proof: String = "renew-proof", requestedDevice: String = device) =
            client().post().uri("/api/auth/google/renew").header("X-Device-Id", requestedDevice)
                .header("Authorization", "Bearer $token").bodyValue(mapOf("idToken" to proof)).exchange()
        renew(expired.token, "invalid-proof").expectStatus().isUnauthorized.expectBody(Void::class.java)
        renew(expired.token, "other-proof").expectStatus().isUnauthorized.expectBody(Void::class.java)
        renew(expired.token, requestedDevice = "foreign-renew-device").expectStatus().isUnauthorized.expectBody(Void::class.java)
        val renewed = renew(expired.token).expectStatus().isOk.expectBody(LoginSession::class.java).returnResult().responseBody!!
        assertNotEquals(expired.token, renewed.token)
        val audit = jdbc.queryForList("SELECT request_payload, response_summary FROM audit_logs WHERE action_name=?", "AuthService.renewGoogleSession")
        assertTrue(audit.isNotEmpty())
        for (row in audit) {
            val stored = row.values.joinToString()
            assertFalse(stored.contains(expired.token))
            assertFalse(stored.contains(renewed.token))
            assertFalse(stored.contains("renew-proof"))
        }
        assertEquals(user.id, sessions.authenticate(device, "Bearer ${renewed.token}"))
        renew(expired.token).expectStatus().isUnauthorized.expectBody(Void::class.java)
        assertEquals("AAPL", settings.findByUserId(user.id!!)!!.watchedStocksRaw)
        sessions.logout(device, "Bearer ${renewed.token}")
        renew(renewed.token).expectStatus().isUnauthorized.expectBody(Void::class.java)
        assertFalse(links.existsById(device))

        val revokedDevice = "renew-revoked-device"
        val controllerDevice = "renew-controller-device"
        links.save(DeviceLink(revokedDevice, user.id!!))
        links.save(DeviceLink(controllerDevice, user.id!!))
        val revoked = sessions.issue(revokedDevice)
        val controller = sessions.issue(controllerDevice)
        val target = sessions.devices(controllerDevice, "Bearer ${controller.token}").single { !it.current }.id
        sessions.revokeDevice(controllerDevice, "Bearer ${controller.token}", target)
        renew(revoked.token, requestedDevice = revokedDevice).expectStatus().isUnauthorized.expectBody(Void::class.java)
        assertFalse(links.existsById(revokedDevice))
    }

    @Test
    fun `HTTP 로그아웃과 Google 재로그인은 관심 기업과 보유 종목 및 이력을 보존하고 폐기 토큰을 거절한다`() {
        val device = "record-preservation-device"
        val sub = "record-preservation-user"
        `when`(google.verify("record-preservation-fixture")).thenReturn(GoogleIdentity(sub, "preserved@example.test", true))
        fun login() = client().post().uri("/api/auth/google/link").header("X-Device-Id", device)
            .bodyValue(mapOf("idToken" to "record-preservation-fixture"))
            .exchange().expectStatus().isOk.expectBody(SettingsResponse::class.java).returnResult().responseBody!!
        val first = login()
        val firstToken = first.session!!.token
        client().put().uri("/api/settings").header("X-Device-Id", device).header("Authorization", "Bearer $firstToken")
            .bodyValue(mapOf("watchedStocks" to listOf("035720.KS"), "interestKeywords" to listOf("반도체")))
            .exchange().expectStatus().isOk.expectBody(Void::class.java)
        val savedPortfolio = client().put().uri("/api/portfolio").header("X-Device-Id", device).header("Authorization", "Bearer $firstToken")
            .bodyValue(PortfolioUpdateRequest(0, "재로그인 보존", 60, "BALANCED", "GENERAL", BigDecimal.ZERO, BigDecimal("10000"),
                listOf(PortfolioHoldingInput("035720.KS", "카카오", BigDecimal("3"), BigDecimal("50000")))))
            .exchange().expectStatus().isOk.expectBody(PortfolioResponse::class.java).returnResult().responseBody!!
        val userId = users.findByGoogleSub(sub)!!.id!!
        val ownerId = settings.findByUserId(userId)!!.id
        val portfolioBefore = jdbc.queryForList("SELECT * FROM portfolios WHERE owner_id=?", ownerId)
        val revisionsBefore = jdbc.queryForList("SELECT * FROM portfolio_revisions WHERE owner_id=? ORDER BY id", ownerId)
        assertEquals(1, portfolioBefore.size)
        assertTrue(revisionsBefore.isNotEmpty())

        client().post().uri("/api/auth/logout").header("X-Device-Id", device).header("Authorization", "Bearer $firstToken")
            .exchange().expectStatus().isNoContent.expectBody(Void::class.java)
        assertFailsWith<UnauthorizedException> { sessions.authenticate(device, "Bearer $firstToken") }
        assertFalse(links.existsById(device))
        client().get().uri("/api/settings").header("X-Device-Id", device)
            .exchange().expectStatus().isOk.expectBody().jsonPath("$.linkedEmail").isEmpty.jsonPath("$.watchedStocks.length()").isEqualTo(0)
        assertEquals("035720.KS", settings.findById(ownerId).get().watchedStocksRaw)
        assertEquals(portfolioBefore, jdbc.queryForList("SELECT * FROM portfolios WHERE owner_id=?", ownerId))
        assertEquals(revisionsBefore, jdbc.queryForList("SELECT * FROM portfolio_revisions WHERE owner_id=? ORDER BY id", ownerId))

        val second = login()
        val secondToken = second.session!!.token
        assertNotEquals(firstToken, secondToken)
        assertEquals(listOf("035720.KS"), second.watchedStocks)
        assertEquals(listOf("반도체"), second.interestKeywords)
        assertEquals(ownerId, settings.findByUserId(userId)!!.id)
        client().get().uri("/api/portfolio").header("X-Device-Id", device).header("Authorization", "Bearer $secondToken")
            .exchange().expectStatus().isOk.expectBody().jsonPath("$.version").isEqualTo(savedPortfolio.version)
            .jsonPath("$.goal").isEqualTo("재로그인 보존").jsonPath("$.cash").isEqualTo(10000)
            .jsonPath("$.holdings[0].holding.symbol").isEqualTo("035720.KS")
            .jsonPath("$.holdings[0].holding.quantity").isEqualTo(3)
        client().get().uri("/api/portfolio").header("X-Device-Id", device).header("Authorization", "Bearer $firstToken")
            .exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        assertEquals(portfolioBefore, jdbc.queryForList("SELECT * FROM portfolios WHERE owner_id=?", ownerId))
        assertEquals(revisionsBefore, jdbc.queryForList("SELECT * FROM portfolio_revisions WHERE owner_id=? ORDER BY id", ownerId))
    }

    @Test
    fun `계정 삭제 마지막 단계 실패는 기록과 세션을 롤백하고 같은 세션 재시도를 허용한다`() {
        val account = users.save(AppUser(googleSub = "deletion-rollback-owner"))
        val shared = settings.save(UserSettings(userId = account.id, watchedStocksRaw = "035720.KS"))
        val firstDevice = "deletion-rollback-first"
        val secondDevice = "deletion-rollback-second"
        links.save(DeviceLink(firstDevice, account.id!!))
        links.save(DeviceLink(secondDevice, account.id!!))
        val first = sessions.issue(firstDevice)
        val second = sessions.issue(secondDevice)
        client().put().uri("/api/portfolio").header("X-Device-Id", firstDevice).header("Authorization", "Bearer ${first.token}")
            .bodyValue(PortfolioUpdateRequest(0, "롤백 보존", 60, "BALANCED", "GENERAL", BigDecimal.ZERO, BigDecimal("1000"),
                listOf(PortfolioHoldingInput("035720.KS", "카카오", BigDecimal("3"), null))))
            .exchange().expectStatus().isOk.expectBody(Void::class.java)
        client().post().uri("/api/community/feedback").header("X-Device-Id", firstDevice).header("Authorization", "Bearer ${first.token}")
            .bodyValue(FeedbackInput(java.util.UUID.randomUUID().toString(), "BUG", "롤백 전 문의 기록", "WEB"))
            .exchange().expectStatus().isOk.expectBody(Void::class.java)
        jdbc.update("INSERT INTO notice_preferences(user_id,hidden_until) VALUES (?,?)", account.id, java.sql.Timestamp.from(Instant.now().plusSeconds(3600)))
        val ownerTables = listOf("portfolios", "portfolio_revisions")
        val userTables = listOf("user_feedback", "notice_preferences", "device_links", "auth_sessions")
        val snapshots = ownerTables.associateWith { jdbc.queryForList("SELECT * FROM $it WHERE owner_id=? ORDER BY 1", shared.id) } +
            userTables.associateWith { jdbc.queryForList("SELECT * FROM $it WHERE user_id=? ORDER BY 1", account.id) }
        assertTrue(snapshots.values.all { it.isNotEmpty() })
        // 마지막 계정 DELETE에 실제 FK 오류를 일으킨다. 외부 DB에는 연결하지 않는 이 클래스의 H2 전용 시험이다.
        jdbc.execute("CREATE TABLE deletion_rollback_guard (user_id BIGINT PRIMARY KEY REFERENCES app_users(id))")
        try {
            jdbc.update("INSERT INTO deletion_rollback_guard(user_id) VALUES (?)", account.id)
            client().delete().uri("/api/auth/account").header("X-Device-Id", firstDevice).header("Authorization", "Bearer ${first.token}")
                .exchange().expectStatus().isEqualTo(409)
            assertTrue(users.existsById(account.id!!))
            assertEquals("035720.KS", settings.findByUserId(account.id!!)?.watchedStocksRaw)
            for (table in ownerTables) assertEquals(snapshots[table], jdbc.queryForList("SELECT * FROM $table WHERE owner_id=? ORDER BY 1", shared.id))
            for (table in userTables) assertEquals(snapshots[table], jdbc.queryForList("SELECT * FROM $table WHERE user_id=? ORDER BY 1", account.id))
            assertEquals(account.id, sessions.authenticate(firstDevice, "Bearer ${first.token}"))
            assertEquals(account.id, sessions.authenticate(secondDevice, "Bearer ${second.token}"))
        } finally {
            jdbc.execute("DROP TABLE deletion_rollback_guard")
        }
        client().delete().uri("/api/auth/account").header("X-Device-Id", firstDevice).header("Authorization", "Bearer ${first.token}")
            .exchange().expectStatus().isNoContent.expectBody(Void::class.java)
        assertFalse(users.existsById(account.id!!))
        assertNull(settings.findByUserId(account.id!!))
        for (table in ownerTables) assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM $table WHERE owner_id=?", Int::class.java, shared.id))
        for (table in userTables) assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM $table WHERE user_id=?", Int::class.java, account.id))
        assertFailsWith<UnauthorizedException> { sessions.authenticate(firstDevice, "Bearer ${first.token}") }
        assertFailsWith<UnauthorizedException> { sessions.authenticate(secondDevice, "Bearer ${second.token}") }
    }

    @Test
    fun `인증된 계정 삭제는 공유 보유와 문의 및 모든 세션을 지우고 다른 계정은 보존한다`() {
        val account = users.save(AppUser(googleSub = "deletion-owner", email = "delete@example.test"))
        val other = users.save(AppUser(googleSub = "deletion-other"))
        val shared = settings.save(UserSettings(userId = account.id, interestKeywordsRaw = "반도체"))
        settings.save(UserSettings(userId = other.id, interestKeywordsRaw = "보존"))
        links.save(DeviceLink("deletion-first", account.id!!))
        links.save(DeviceLink("deletion-second", account.id!!))
        links.save(DeviceLink("deletion-other-device", other.id!!))
        val first = sessions.issue("deletion-first")
        val second = sessions.issue("deletion-second")
        val otherSession = sessions.issue("deletion-other-device")
        client().put().uri("/api/portfolio").header("X-Device-Id", "deletion-first").header("Authorization", "Bearer ${first.token}")
            .bodyValue(com.firewatch.backend.web.dto.PortfolioUpdateRequest(0, "삭제 검사", 60, "BALANCED", "GENERAL", java.math.BigDecimal.ZERO, java.math.BigDecimal("1000"), emptyList()))
            .exchange().expectStatus().isOk.expectBody(Void::class.java)
        client().post().uri("/api/community/feedback").header("X-Device-Id", "deletion-first").header("Authorization", "Bearer ${first.token}")
            .bodyValue(FeedbackInput(java.util.UUID.randomUUID().toString(), "BUG", "삭제 전 문의 기록 검사", "WEB"))
            .exchange().expectStatus().isOk.expectBody(Void::class.java)
        jdbc.update("INSERT INTO notice_preferences(user_id,hidden_until) VALUES (?,?)", account.id, java.sql.Timestamp.from(Instant.now().plusSeconds(3600)))
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM portfolios WHERE owner_id=?", Int::class.java, shared.id))
        assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM portfolio_revisions WHERE owner_id=?", Int::class.java, shared.id)!! > 0)
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM user_feedback WHERE user_id=?", Int::class.java, account.id))
        client().delete().uri("/api/auth/account").header("X-Device-Id", "deletion-first").header("Authorization", "Bearer ${otherSession.token}")
            .exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        assertTrue(users.existsById(account.id!!))
        client().delete().uri("/api/auth/account").header("X-Device-Id", "deletion-first").header("Authorization", "Bearer ${first.token}")
            .exchange().expectStatus().isNoContent.expectBody(Void::class.java)
        assertFalse(users.existsById(account.id!!))
        assertNull(settings.findByUserId(account.id!!))
        for (table in listOf("portfolios", "portfolio_revisions")) {
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM $table WHERE owner_id=?", Int::class.java, shared.id))
        }
        for (table in listOf("user_feedback", "notice_preferences", "device_links", "auth_sessions")) {
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM $table WHERE user_id=?", Int::class.java, account.id))
        }
        assertFailsWith<UnauthorizedException> { sessions.authenticate("deletion-second", "Bearer ${second.token}") }
        assertEquals(other.id, sessions.authenticate("deletion-other-device", "Bearer ${otherSession.token}"))
        assertEquals("보존", settings.findByUserId(other.id!!)?.interestKeywordsRaw)
    }

    @Test
    fun `모든 운영 API는 공개 설정 키와 일반 계정 및 위조 이메일을 거절한다`() {
        val device = "ordinary-operations"
        val user = users.save(AppUser(googleSub = device, email = "ordinary@example.com", emailVerified = true))
        links.save(DeviceLink(device, user.id!!))
        val session = sessions.issue(device)
        val routes = listOf("/api/collection/operator", "/api/collection/operator/test", "/api/scheduler/trigger", "/api/scheduler/trigger-if-due", "/api/settings/recover-legacy", "/api/operations/database-pool", "/api/operations/latency")
        for (route in routes) {
            fun request() = if (route.startsWith("/api/operations")) client().get().uri(route) else client().post().uri(route)
            request().exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
            request().header("X-API-Key", "session-test-key").header("X-Device-Id", device).exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
            request().header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").header("X-User-Email", "powerhch@gmail.com").exchange().expectStatus().isForbidden.expectBody(Void::class.java)
        }
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM collection_operator", Int::class.java))
    }

    @Test
    fun `운영자 세션으로 진단과 푸시 등록이 가능하고 해제하면 즉시 거절한다`() {
        val device = "owner-operations"
        val user = users.save(AppUser(googleSub = device, email = "powerhch@gmail.com", emailVerified = true))
        val row = settings.save(UserSettings(userId = user.id, fcmTokensRaw = "fixture-operator-token"))
        links.save(DeviceLink(device, user.id!!))
        val session = sessions.issue(device)
        for (route in listOf("/api/operations/database-pool", "/api/operations/latency")) {
            client().get().uri(route).header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").exchange().expectStatus().isOk.expectBody(Void::class.java)
        }
        client().post().uri("/api/collection/operator").header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").exchange().expectStatus().isOk.expectBody(Void::class.java)
        assertEquals(row.id, jdbc.queryForObject("SELECT settings_id FROM collection_operator WHERE id=1", Long::class.java))
        sessions.logout(device, "Bearer ${session.token}")
        client().post().uri("/api/collection/operator").header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        jdbc.update("DELETE FROM collection_operator")
    }

    @Test
    fun `감사로그는 인증된 운영자나 관리 키만 읽을 수 있다`() {
        client().get().uri("/api/audit-logs").exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        client().get().uri("/api/audit-logs").header("X-API-Key", "wrong").exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        client().get().uri("/api/audit-logs").header("X-API-Key", "session-test-key").exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        client().get().uri("/api/audit-logs").header("X-API-Key", "operator-test-key").exchange().expectStatus().isOk.expectBody(Void::class.java)
        data class Case(val suffix: String, val email: String, val verified: Boolean, val allowed: Boolean)
        for ((suffix, email, verified, allowed) in listOf(
            Case("owner", "powerhch@gmail.com", true, true),
            Case("user", "user@example.com", true, false),
            Case("unverified", "powerhch@gmail.com", false, false),
        )) {
            val device = "operator-$suffix"
            val user = users.save(AppUser(googleSub = device, email = email, emailVerified = verified))
            links.save(DeviceLink(device, user.id!!))
            val session = sessions.issue(device)
            client().get().uri("/api/audit-logs").header("X-Device-Id", device).exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
            val response = client().get().uri("/api/audit-logs").header("X-Device-Id", device).header("Authorization", "Bearer ${session.token}").header("X-User-Email", "powerhch@gmail.com").exchange()
            if (allowed) response.expectStatus().isOk.expectBody(Void::class.java) else response.expectStatus().isForbidden.expectBody(Void::class.java)
            client().get().uri("/api/audit-logs").header("X-Device-Id", "other-$device").header("Authorization", "Bearer ${session.token}").exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        }
    }

    @Test
    fun `연동된 개인 데이터는 기기 ID만으로 읽을 수 없고 만료와 기기 바인딩을 검사한다`() {
        val user = users.save(AppUser(googleSub = "session-user-one"))
        settings.save(UserSettings(userId = user.id))
        links.save(DeviceLink("session-device-one", user.id!!))
        links.save(DeviceLink("session-device-two", user.id!!))
        val first = sessions.issue("session-device-one")
        val replacement = sessions.issue("session-device-one")
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-device-one", "Bearer ${first.token}") }
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-device-two", "Bearer ${replacement.token}") }
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-device-one", "Bearer ${replacement.token}", replacement.expiresAt) }
        assertEquals(user.id, sessions.authenticate("session-device-one", "Bearer ${replacement.token}"))
        assertNotEquals(replacement.token, jdbc.queryForObject("SELECT token_hash FROM auth_sessions WHERE device_id=?", String::class.java, "session-device-one"))
        client().get().uri("/api/settings").header("X-Device-Id", "session-device-one").exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        client().get().uri("/api/settings").header("X-Device-Id", "session-device-one").header("Authorization", "Bearer ${replacement.token}").exchange().expectStatus().isOk.expectBody(Void::class.java)
        client().delete().uri("/api/auth/account").header("X-Device-Id", "session-device-one").exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
    }

    @Test
    fun `다른 계정 기기는 해제할 수 없고 로그아웃과 연결 해제는 공유 데이터를 보존한다`() {
        val user = users.save(AppUser(googleSub = "session-user-revoke"))
        val saved = settings.save(UserSettings(userId = user.id, watchedStocksRaw = "AAPL"))
        links.save(DeviceLink("session-revoke-one", user.id!!))
        links.save(DeviceLink("session-revoke-two", user.id!!))
        val first = sessions.issue("session-revoke-one")
        val second = sessions.issue("session-revoke-two")
        val authorization = "Bearer ${first.token}"
        val devices = sessions.devices("session-revoke-one", authorization)
        assertEquals(2, devices.size)
        assertTrue(devices.none { it.id.contains("session-revoke") })
        assertFailsWith<NotFoundException> { sessions.revokeDevice("session-revoke-one", authorization, "foreign-device") }
        sessions.revokeDevice("session-revoke-one", authorization, devices.single { !it.current }.id)
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-revoke-two", "Bearer ${second.token}") }
        sessions.logout("session-revoke-one", authorization)
        assertFailsWith<UnauthorizedException> { sessions.authenticate("session-revoke-one", authorization) }
        assertEquals("AAPL", settings.findById(saved.id).get().watchedStocksRaw)
        assertTrue(users.existsById(user.id!!))
        client().get().uri("/api/settings").header("X-Device-Id", "session-revoke-one").exchange().expectStatus().isOk.expectBody().jsonPath("$.linkedEmail").isEmpty
    }

    @Test
    fun `응답 시간 헤더를 제공하고 운영 지표는 관리 키로 보호한다`() {
        client().get().uri("/api/portfolio").header("X-Device-Id", "latency-anonymous").exchange().expectStatus().isOk.expectHeader().valueMatches("Server-Timing", "application;dur=\\d+").expectBody(Void::class.java)
        client().get().uri("/api/operations/latency").exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        client().get().uri("/api/operations/latency").header("X-API-Key", "session-test-key").exchange().expectStatus().isUnauthorized.expectBody(Void::class.java)
        client().get().uri("/api/operations/latency").header("X-API-Key", "operator-test-key").exchange().expectStatus().isOk.expectBody()
            .jsonPath("$[?(@.operation == 'GET portfolio')]").isNotEmpty
            .jsonPath("$[?(@.operation == 'GET portfolio')].failures").isEqualTo(0)
    }
}
