package com.firewatch.backend.service

import com.firewatch.backend.entity.GameSessionStatus
import com.firewatch.backend.web.ConflictException
import com.firewatch.backend.web.NotFoundException
import com.firewatch.backend.web.ValidationException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.sql.Timestamp
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import java.util.UUID

@Component
class GameRankingClock { fun now(): Instant = Instant.now() }
data class RankingSubmission(val sessionId: Long, val expectedTurnIndex: Int, val nickname: String)
data class RankingEntry(val id: String, val nickname: String, val weekStart: LocalDate, val board: String,
    val difficulty: String, val shortSelling: Boolean, val turnIndex: Int, val returnPercent: BigDecimal,
    val submittedAt: Instant, val visible: Boolean)
data class RankedEntry(val rank: Int, val entry: RankingEntry)
data class RankingBoard(val weekStart: LocalDate, val closesAt: Instant, val closed: Boolean,
    val total: Int, val page: Int, val entries: List<RankedEntry>)
data class RankingMine(val nickname: String?, val entries: List<RankingEntry>, val total: Int, val page: Int)

/** Opt-in free-play scores. Different seeds are disclosed; this is not a shared-seed tournament. */
@Service
@Transactional
class GameRankingService(private val jdbc: JdbcTemplate, private val games: GameService, private val clock: GameRankingClock) {
    private val zone = ZoneId.of("Asia/Seoul")
    fun weekOf(now: Instant): LocalDate = now.atZone(zone).toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    private fun bad(message: String): Nothing = throw ValidationException(message, emptyMap())
    private fun rows(sql: String, vararg args: Any): List<RankingEntry> = jdbc.query(sql, { r, _ ->
        RankingEntry(r.getString("id"), r.getString("nickname"), r.getDate("week_start").toLocalDate(),
            r.getString("board"), r.getString("difficulty"), r.getBoolean("short_selling"), r.getInt("turn_index"),
            r.getBigDecimal("return_percent"), r.getTimestamp("submitted_at").toInstant(), r.getBoolean("visible"))
    }, *args)
    private val joined = "SELECT e.*,p.nickname FROM game_ranking_entries e JOIN game_ranking_profiles p ON e.user_id=p.user_id"
    private fun lockAndClose(): Pair<LocalDate, Instant> {
        // One shared lock makes week closure atomic across simultaneous requests and server restarts.
        jdbc.queryForObject("SELECT id FROM game_ranking_state WHERE id=1 FOR UPDATE", Int::class.java)
        val now = clock.now()
        val current = weekOf(now)
        val weeks = jdbc.query("SELECT DISTINCT week_start FROM game_ranking_entries WHERE week_start<? AND week_start NOT IN (SELECT week_start FROM game_ranking_closed_weeks)", { r, _ -> r.getDate(1).toLocalDate() }, current)
        for (week in weeks) {
            jdbc.update("""INSERT INTO game_ranking_winners(week_start,difficulty,short_selling,entry_id)
                SELECT week_start,difficulty,short_selling,id FROM (
                  SELECT e.*,ROW_NUMBER() OVER(PARTITION BY difficulty,short_selling ORDER BY return_percent DESC,submitted_at,id) n
                  FROM game_ranking_entries e WHERE week_start=? AND board='FINISHED' AND visible=TRUE
                ) scores WHERE n=1""", week)
            jdbc.update("INSERT INTO game_ranking_closed_weeks(week_start) VALUES (?)", week)
        }
        return current to now
    }

    fun submit(owner: Long, device: String, input: RankingSubmission): RankingEntry {
        val period = lockAndClose()
        val currentWeek = period.first
        jdbc.queryForObject("SELECT id FROM app_users WHERE id=? FOR UPDATE", Long::class.java, owner)
        val nickname = input.nickname.trim()
        if (!nickname.matches(Regex("[\\p{L}\\p{N}_ -]{2,16}"))) bad("닉네임은 이메일 대신 한글·영문·숫자 등 2~16자로 입력해주세요.")
        val profile = jdbc.query("SELECT nickname FROM game_ranking_profiles WHERE user_id=?", { r, _ -> r.getString(1) }, owner).firstOrNull()
        if (profile != null && nickname != profile) bad("이미 등록한 게임 닉네임 $profile 을 사용해주세요.")
        val snapshot = games.getRankingSnapshot(device, input.sessionId)
        if (!snapshot.simulation || snapshot.turnIndex < 1 || snapshot.startingCash <= BigDecimal.ZERO || snapshot.portfolioValue == null) bad("평가가 확정된 가상 게임의 2턴 이후 기록만 등록할 수 있습니다.")
        if (snapshot.turnIndex != input.expectedTurnIndex) throw ConflictException("턴이 변경됐습니다. 현재 게임을 확인하고 다시 등록해주세요.")
        val board = if (snapshot.status == GameSessionStatus.ENDED && snapshot.turnIndex == snapshot.totalTurns - 1) "FINISHED" else "PROGRESS"
        // Retries keep the original publication week/score and cannot enter an old game again next week.
        rows("$joined WHERE e.session_id=? AND e.turn_index=? AND e.board=?", input.sessionId, snapshot.turnIndex, board).firstOrNull()?.let {
            val existingOwner = jdbc.queryForObject("SELECT user_id FROM game_ranking_entries WHERE id=?", Long::class.java, it.id)
            if (existingOwner != owner) throw ConflictException("이미 등록된 게임 기록입니다.")
            return it
        }
        if ((jdbc.queryForObject("SELECT COUNT(*) FROM game_ranking_entries WHERE user_id=? AND week_start=?", Long::class.java, owner, currentWeek) ?: 0) >= 200) bad("이번 주 등록 가능한 기록 수를 초과했습니다.")
        if (profile == null) {
            if ((jdbc.queryForObject("SELECT COUNT(*) FROM game_ranking_profiles WHERE nickname_key=?", Long::class.java, nickname.lowercase(Locale.ROOT)) ?: 0) > 0) throw ConflictException("다른 플레이어가 사용하는 닉네임입니다.")
            jdbc.update("INSERT INTO game_ranking_profiles(user_id,nickname,nickname_key) VALUES (?,?,?)", owner, nickname, nickname.lowercase(Locale.ROOT))
        }
        val difficulty = when (snapshot.startingCash.compareTo(BigDecimal("10000000"))) { 0 -> "NORMAL"; 1 -> "EASY"; else -> "HARD" }
        val score = snapshot.portfolioValue.subtract(snapshot.startingCash).divide(snapshot.startingCash, 10, RoundingMode.HALF_UP).multiply(BigDecimal(100)).setScale(8, RoundingMode.HALF_UP)
        val id = UUID.randomUUID().toString()
        jdbc.update("INSERT INTO game_ranking_entries(id,user_id,session_id,turn_index,board,difficulty,short_selling,week_start,return_percent,submitted_at,visible) VALUES (?,?,?,?,?,?,?,?,?,?,TRUE)", id, owner, input.sessionId, snapshot.turnIndex, board, difficulty, snapshot.allowShortSelling, currentWeek, score, Timestamp.from(period.second))
        return rows("$joined WHERE e.id=?", id).single()
    }

    fun board(week: LocalDate?, difficulty: String, shortSelling: Boolean, board: String, turn: Int, page: Int): RankingBoard {
        val current = lockAndClose().first
        val selected = week ?: current
        if (selected.dayOfWeek != DayOfWeek.MONDAY || selected > current || selected < current.minusWeeks(104) || difficulty !in listOf("EASY", "NORMAL", "HARD") || board !in listOf("FINISHED", "PROGRESS") || turn !in 1..23 || page !in 0..10000) bad("순위 조회 조건이 올바르지 않습니다.")
        // Each account occupies one place per league: best score, earliest submission on ties.
        val filtered = """SELECT * FROM (SELECT e.*,p.nickname,ROW_NUMBER() OVER(PARTITION BY e.user_id ORDER BY e.return_percent DESC,e.submitted_at,e.id) best
            FROM game_ranking_entries e JOIN game_ranking_profiles p ON e.user_id=p.user_id
            WHERE e.week_start=? AND e.difficulty=? AND e.short_selling=? AND e.board=? AND e.turn_index=? AND e.visible=TRUE) s WHERE best=1"""
        val args = arrayOf<Any>(selected, difficulty, shortSelling, board, if (board == "FINISHED") 23 else turn)
        val count = jdbc.queryForObject("SELECT COUNT(*) FROM ($filtered) counted", Int::class.java, *args) ?: 0
        val entries = rows("$filtered ORDER BY return_percent DESC,submitted_at,id LIMIT 20 OFFSET ?", *args, page * 20)
        return RankingBoard(selected, selected.plusWeeks(1).atStartOfDay(zone).toInstant(), selected < current, count, page, entries.mapIndexed { i, e -> RankedEntry(page * 20 + i + 1, e) })
    }
    fun winners(page: Int): List<RankingEntry> {
        lockAndClose()
        if (page !in 0..10000) bad("페이지가 올바르지 않습니다.")
        return rows("$joined JOIN game_ranking_winners w ON w.entry_id=e.id WHERE e.visible=TRUE ORDER BY w.week_start DESC,e.difficulty,e.short_selling LIMIT 30 OFFSET ?", page * 30)
    }
    fun mine(owner: Long, page: Int): RankingMine {
        if (page !in 0..10000) bad("페이지가 올바르지 않습니다.")
        return RankingMine(jdbc.query("SELECT nickname FROM game_ranking_profiles WHERE user_id=?", { r, _ -> r.getString(1) }, owner).firstOrNull(),
            rows("$joined WHERE e.user_id=? ORDER BY e.submitted_at DESC,e.id LIMIT 20 OFFSET ?", owner, page * 20),
            jdbc.queryForObject("SELECT COUNT(*) FROM game_ranking_entries WHERE user_id=?", Int::class.java, owner) ?: 0, page)
    }
    fun withdraw(owner: Long, id: String) {
        lockAndClose()
        if (jdbc.update("UPDATE game_ranking_entries SET visible=FALSE WHERE id=? AND user_id=?", id, owner) != 1) throw NotFoundException("내 순위 기록을 찾을 수 없습니다.")
        // A closed week's winner is never reassigned on withdrawal; the public archive simply hides it.
    }
}
