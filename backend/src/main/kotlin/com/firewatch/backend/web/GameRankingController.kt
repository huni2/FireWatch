package com.firewatch.backend.web

import com.firewatch.backend.repository.AuthSessions
import com.firewatch.backend.service.GameRankingService
import com.firewatch.backend.service.RankingSubmission
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

@RestController
@RequestMapping("/api/game/rankings")
class GameRankingController(private val rankings: GameRankingService, private val sessions: AuthSessions) {
    private fun user(device: String?, auth: String?) = sessions.authenticate(device ?: throw UnauthorizedException("순위 등록은 Google 로그인이 필요합니다."), auth)
    @GetMapping
    suspend fun board(@RequestParam(required=false) week: LocalDate?, @RequestParam(defaultValue="NORMAL") difficulty: String,
        @RequestParam(defaultValue="false") shortSelling: Boolean, @RequestParam(defaultValue="FINISHED") board: String,
        @RequestParam(defaultValue="23") turn: Int, @RequestParam(defaultValue="0") page: Int) = withContext(Dispatchers.IO) { rankings.board(week, difficulty, shortSelling, board, turn, page) }
    @GetMapping("/winners")
    suspend fun winners(@RequestParam(defaultValue="0") page: Int) = withContext(Dispatchers.IO) { rankings.winners(page) }
    @GetMapping("/mine")
    suspend fun mine(@RequestParam(defaultValue="0") page: Int, @RequestHeader("X-Device-Id",required=false) device: String?, @RequestHeader("Authorization",required=false) auth: String?) = withContext(Dispatchers.IO) { rankings.mine(user(device,auth),page) }
    @PostMapping
    suspend fun submit(@RequestHeader("X-Device-Id",required=false) device: String?, @RequestHeader("Authorization",required=false) auth: String?, @RequestBody input: RankingSubmission) = withContext(Dispatchers.IO) { rankings.submit(user(device,auth),device!!,input) }
    @DeleteMapping("/{id}")
    suspend fun withdraw(@PathVariable id: String, @RequestHeader("X-Device-Id",required=false) device: String?, @RequestHeader("Authorization",required=false) auth: String?) = withContext(Dispatchers.IO) { rankings.withdraw(user(device,auth),id); mapOf("withdrawn" to true) }
}
