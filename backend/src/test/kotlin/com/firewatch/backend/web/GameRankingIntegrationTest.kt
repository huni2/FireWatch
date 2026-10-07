package com.firewatch.backend.web

import com.firewatch.backend.entity.*
import com.firewatch.backend.repository.*
import com.firewatch.backend.service.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.reactive.server.WebTestClient
import org.springframework.jdbc.core.JdbcTemplate
import org.mockito.Mockito.`when`
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID
import kotlin.test.*

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:game-rankings;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-"])
class GameRankingIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @LocalServerPort var port = 0
    @Autowired lateinit var users: AppUserRepository
    @Autowired lateinit var links: DeviceLinkRepository
    @Autowired lateinit var sessions: AuthSessions
    @Autowired lateinit var games: GameSessionRepository
    @Autowired lateinit var transactions: GameTransactionRepository
    @Autowired lateinit var jdbc: JdbcTemplate
    @MockitoBean lateinit var clock: GameRankingClock
    private fun client() = WebTestClient.bindToServer().baseUrl("http://localhost:$port").build()
    private data class Player(val user: Long, val device: String, val auth: String)
    private fun login(): Player {
        val device = UUID.randomUUID().toString()
        val account = users.save(AppUser(googleSub=device,email="private-$device@example.com",emailVerified=true))
        links.save(DeviceLink(device,account.id!!))
        return Player(account.id!!,device,"Bearer ${sessions.issue(device).token}")
    }
    private fun game(p: Player, turn: Int=23, ended: Boolean=true, cash: String="10000000", short: Boolean=false) = games.save(GameSession(deviceId=p.device,
        status=if(ended) GameSessionStatus.ENDED else GameSessionStatus.ACTIVE, turnDatesRaw=GameSimulation.dates(42L).joinToString(","),
        currentTurnIndex=turn, startingCash=BigDecimal(cash),allowShortSelling=short,simulationSeed=42L))
    private fun publish(p: Player, g: GameSession, nickname: String) = client().post().uri("/api/game/rankings").header("X-Device-Id",p.device).header("Authorization",p.auth)
        .bodyValue(RankingSubmission(g.id!!,g.currentTurnIndex,nickname)).exchange().expectStatus().isOk.expectBody(RankingEntry::class.java).returnResult().responseBody!!
    @BeforeEach fun reset() {
        jdbc.update("DELETE FROM game_ranking_winners");jdbc.update("DELETE FROM game_ranking_closed_weeks");jdbc.update("DELETE FROM game_ranking_entries");jdbc.update("DELETE FROM game_ranking_profiles")
        `when`(clock.now()).thenReturn(Instant.parse("2026-10-07T10:00:00Z"))
    }
    @Test fun `registration is opt in authenticated owned server scored and idempotent`() {
        val p=login();val g=game(p);val input=RankingSubmission(g.id!!,23,"게임닉네임")
        client().get().uri("/api/game/rankings").exchange().expectStatus().isOk.expectBody().jsonPath("$.total").isEqualTo(0)
        client().post().uri("/api/game/rankings").bodyValue(input).exchange().expectStatus().isUnauthorized
        client().post().uri("/api/game/rankings").header("X-Device-Id",p.device).header("Authorization",p.auth).bodyValue(input.copy(expectedTurnIndex=22)).exchange().expectStatus().isEqualTo(409)
        val other=login()
        client().post().uri("/api/game/rankings").header("X-Device-Id",other.device).header("Authorization",other.auth).bodyValue(input).exchange().expectStatus().isNotFound
        val e=publish(p,g,"게임닉네임");assertEquals(0,e.returnPercent.compareTo(BigDecimal.ZERO));assertEquals("FINISHED",e.board)
        assertEquals(e.id,publish(p,g,"게임닉네임").id)
        client().post().uri("/api/game/rankings").header("X-Device-Id",p.device).header("Authorization",p.auth)
            .bodyValue(mapOf("sessionId" to g.id!!,"expectedTurnIndex" to 23,"nickname" to "게임닉네임","returnPercent" to 999999)).exchange().expectStatus().isOk.expectBody().jsonPath("$.returnPercent").isEqualTo(0.0)
        val raw=client().get().uri("/api/game/rankings").exchange().expectStatus().isOk.expectBody(String::class.java).returnResult().responseBody!!
        assertFalse(raw.contains("@example.com"));assertFalse(raw.contains("userId"));assertFalse(raw.contains("deviceId"));assertFalse(raw.contains("sessionId"))
        client().get().uri("/api/game/current").header("X-Device-Id",p.device).exchange().expectStatus().isUnauthorized
        client().delete().uri("/api/game/rankings/${e.id}").header("X-Device-Id",other.device).header("Authorization",other.auth).exchange().expectStatus().isNotFound
        client().delete().uri("/api/game/rankings/${e.id}").header("X-Device-Id",p.device).header("Authorization",p.auth).exchange().expectStatus().isOk
        client().get().uri("/api/game/rankings").exchange().expectStatus().isOk.expectBody().jsonPath("$.total").isEqualTo(0)
        assertFalse(publish(p,g,"게임닉네임").visible)
    }
    @Test fun `leagues separate completion turn difficulty and short mode with one best place per account`() {
        val p=login();publish(p,game(p),"플레이어하나");publish(p,game(p),"플레이어하나")
        val early=login();assertEquals("PROGRESS",publish(early,game(early,4),"중도종료").board)
        val easy=login();publish(easy,game(easy,cash="20000000"),"쉬움모드")
        val short=login();publish(short,game(short,short=true),"공매도모드")
        val active=login();publish(active,game(active,6,false),"진행중플레이어")
        fun count(query: String, expected: Int) { client().get().uri("/api/game/rankings$query").exchange().expectStatus().isOk.expectBody().jsonPath("$.total").isEqualTo(expected) }
        count("",1);count("?difficulty=EASY",1);count("?shortSelling=true",1)
        count("?board=PROGRESS&turn=4",1);count("?board=PROGRESS&turn=6",1);count("?board=PROGRESS&turn=3",0)
        client().get().uri("/api/game/rankings/mine").header("X-Device-Id",p.device).header("Authorization",p.auth).exchange().expectStatus().isOk.expectBody().jsonPath("$.total").isEqualTo(2).jsonPath("$.entries.length()").isEqualTo(2)
        client().get().uri("/api/game/rankings/mine?page=1").header("X-Device-Id",p.device).header("Authorization",p.auth).exchange().expectStatus().isOk.expectBody().jsonPath("$.total").isEqualTo(2).jsonPath("$.entries.length()").isEqualTo(0)
        client().get().uri("/api/game/rankings/mine").header("X-Device-Id",p.device).header("Authorization",easy.auth).exchange().expectStatus().isUnauthorized
        val legacy=game(p).also { it.simulationSeed=null };games.saveAndFlush(legacy)
        client().post().uri("/api/game/rankings").header("X-Device-Id",p.device).header("Authorization",p.auth).bodyValue(RankingSubmission(legacy.id!!,23,"플레이어하나")).exchange().expectStatus().isBadRequest
        client().get().uri("/api/game/rankings?week=2026-10-06").exchange().expectStatus().isBadRequest
        client().get().uri("/api/game/rankings?turn=24").exchange().expectStatus().isBadRequest
        client().post().uri("/api/game/rankings").header("X-Device-Id",p.device).header("Authorization",p.auth)
            .bodyValue(RankingSubmission(game(p,0,false).id!!,0,"플레이어하나")).exchange().expectStatus().isBadRequest
        val collision=login()
        client().post().uri("/api/game/rankings").header("X-Device-Id",collision.device).header("Authorization",collision.auth)
            .bodyValue(RankingSubmission(game(collision).id!!,23,"플레이어하나")).exchange().expectStatus().isEqualTo(409)
    }
    @Test fun `KST Monday closes winners once and withdrawal or deletion does not reassign winner`() {
        `when`(clock.now()).thenReturn(Instant.parse("2026-10-11T14:59:59Z"))
        val p=login();val g=game(p);val e=publish(p,g,"주간우승자");assertEquals(java.time.LocalDate.parse("2026-10-05"),e.weekStart)
        `when`(clock.now()).thenReturn(Instant.parse("2026-10-11T14:59:59.500Z"))
        val q=login();publish(q,game(q),"다음플레이어")
        `when`(clock.now()).thenReturn(Instant.parse("2026-10-11T15:00:00Z"))
        client().get().uri("/api/game/rankings/winners").exchange().expectStatus().isOk.expectBody().jsonPath("$[0].id").isEqualTo(e.id)
        assertEquals(e.id,publish(p,g,"주간우승자").id)
        client().get().uri("/api/game/rankings").exchange().expectStatus().isOk.expectBody().jsonPath("$.weekStart").isEqualTo("2026-10-12").jsonPath("$.total").isEqualTo(0)
        client().delete().uri("/api/game/rankings/${e.id}").header("X-Device-Id",p.device).header("Authorization",p.auth).exchange().expectStatus().isOk
        client().get().uri("/api/game/rankings/winners").exchange().expectStatus().isOk.expectBody().json("[]")
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM game_ranking_winners",Int::class.java))
        jdbc.update("DELETE FROM app_users WHERE id=?",p.user)
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_ranking_entries WHERE user_id=?",Int::class.java,p.user))
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_ranking_profiles WHERE user_id=?",Int::class.java,p.user))
        client().get().uri("/api/game/rankings/winners").exchange().expectStatus().isOk.expectBody().json("[]")
    }
    @Test fun `score is derived from persisted fills and concurrent retries create one record`() {
        val p=login();val g=game(p)
        val initial=GameSimulation.price(42L,0,GameInstrumentType.STOCK,"AURA")!!
        val current=GameSimulation.price(42L,23,GameInstrumentType.STOCK,"AURA")!!
        transactions.saveAndFlush(GameTransaction(sessionId=g.id!!,turnIndex=0,instrumentType=GameInstrumentType.STOCK,symbol="AURA",action=GameTradeAction.BUY,quantity=BigDecimal.TEN,price=initial))
        val pool=java.util.concurrent.Executors.newFixedThreadPool(2)
        try {
            val tasks=(1..2).map { pool.submit<RankingEntry> { publish(p,g,"동시등록") } }
            val entries=tasks.map { it.get(30,java.util.concurrent.TimeUnit.SECONDS) }
            assertEquals(entries[0].id,entries[1].id)
            val expected=current.subtract(initial).multiply(BigDecimal.TEN).setScale(2,java.math.RoundingMode.HALF_UP).divide(g.startingCash,10,java.math.RoundingMode.HALF_UP).multiply(BigDecimal(100)).setScale(8,java.math.RoundingMode.HALF_UP)
            assertEquals(0,expected.compareTo(entries[0].returnPercent))
            assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM game_ranking_entries WHERE session_id=?",Int::class.java,g.id!!))
        } finally { pool.shutdownNow() }
    }
}
