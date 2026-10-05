package com.firewatch.backend.web

import com.firewatch.backend.service.GameService
import com.firewatch.backend.web.dto.GameStartRequest
import com.firewatch.backend.web.dto.GameTradeRequest
import com.firewatch.backend.web.dto.GameTurnResponse
import com.firewatch.backend.web.dto.toResponse
import jakarta.validation.Valid
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

// Design Ref: 가상투자 게임(2026-10-05) — 기기당 활성 세션 1개, Settings와 동일하게 X-Device-Id로만 식별.
@RestController
@RequestMapping("/api/game")
class GameController(private val gameService: GameService) {
    @PostMapping("/start")
    suspend fun start(
        @RequestHeader("X-Device-Id", required = false) deviceId: String?,
        // 이미 활성 세션이 있으면 어차피 무시되니(GameService 참고) 본문 없이도 호출 가능 — 프론트가
        // "게임이 있으면 이어하기" 목적으로 매번 부를 때 난이도를 안 보내도 되게 한다.
        @RequestBody(required = false) request: GameStartRequest?,
    ): GameTurnResponse = withContext(Dispatchers.IO) {
        val effective = request ?: GameStartRequest()
        gameService.startGame(deviceId.requireDeviceId(), effective.difficulty, effective.allowShortSelling).toResponse()
    }

    @GetMapping("/current")
    suspend fun current(@RequestHeader("X-Device-Id", required = false) deviceId: String?): GameTurnResponse =
        withContext(Dispatchers.IO) { gameService.getCurrentTurn(deviceId.requireDeviceId()).toResponse() }

    @PostMapping("/trade")
    suspend fun trade(
        @RequestHeader("X-Device-Id", required = false) deviceId: String?,
        @Valid @RequestBody request: GameTradeRequest,
    ): GameTurnResponse = withContext(Dispatchers.IO) {
        gameService.trade(
            deviceId = deviceId.requireDeviceId(),
            instrumentType = request.instrumentType,
            symbol = request.symbol,
            action = request.action,
            quantity = request.quantity,
        ).toResponse()
    }

    @PostMapping("/next-turn")
    suspend fun nextTurn(@RequestHeader("X-Device-Id", required = false) deviceId: String?): GameTurnResponse =
        withContext(Dispatchers.IO) { gameService.nextTurn(deviceId.requireDeviceId()).toResponse() }
}
