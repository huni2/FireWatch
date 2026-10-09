package com.firewatch.backend.web

import com.firewatch.backend.service.GameService
import com.firewatch.backend.metrics.GameRequestTiming
import com.firewatch.backend.metrics.GameTimingOperation
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
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

// Design Ref: 가상투자 게임(2026-10-05) — 기기당 활성 세션 1개, Settings와 동일하게 X-Device-Id로만 식별.
@RestController
@RequestMapping("/api/game")
class GameController(private val gameService: GameService, private val timing: GameRequestTiming) {
    private suspend fun <T> measured(operation: GameTimingOperation, block: () -> T): T {
        val queuedAt = System.nanoTime()
        return withContext(Dispatchers.IO) { timing.measure(operation, queuedAt, block) }
    }
    @PostMapping("/start")
    suspend fun start(
        @RequestHeader("X-Device-Id", required = false) deviceId: String?,
        // 이미 활성 세션이 있으면 어차피 무시되니(GameService 참고) 본문 없이도 호출 가능 — 프론트가
        // "게임이 있으면 이어하기" 목적으로 매번 부를 때 난이도를 안 보내도 되게 한다.
        @RequestBody(required = false) request: GameStartRequest?,
        @RequestParam(defaultValue = "false") compact: Boolean,
    ): GameTurnResponse = measured(GameTimingOperation.START) {
        val effective = request ?: GameStartRequest()
        gameService.startGame(deviceId.requireDeviceId(), effective.difficulty, effective.allowShortSelling, if (compact) 2 else 24).toResponse()
    }

    @GetMapping("/current")
    suspend fun current(@RequestHeader("X-Device-Id", required = false) deviceId: String?, @RequestParam(defaultValue = "false") compact: Boolean): GameTurnResponse =
        measured(GameTimingOperation.CURRENT) { gameService.getCurrentTurn(deviceId.requireDeviceId(), if (compact) 2 else 24).toResponse() }

    @GetMapping("/sessions/{sessionId}/assets/history")
    suspend fun history(
        @RequestHeader("X-Device-Id", required = false) deviceId: String?,
        @PathVariable sessionId: Long,
        @RequestParam turnIndex: Int,
        @RequestParam instrumentType: com.firewatch.backend.entity.GameInstrumentType,
        @RequestParam(required = false) symbol: String?,
    ): GameAssetHistoryResponse = measured(GameTimingOperation.HISTORY) {
        GameAssetHistoryResponse(sessionId, turnIndex, gameService.getAssetHistory(deviceId.requireDeviceId(), sessionId, turnIndex, instrumentType, symbol))
    }

    @PostMapping("/trade")
    suspend fun trade(
        @RequestHeader("X-Device-Id", required = false) deviceId: String?,
        @Valid @RequestBody request: GameTradeRequest,
        @RequestParam(defaultValue = "false") compact: Boolean,
    ): GameTurnResponse = measured(GameTimingOperation.TRADE) {
        gameService.trade(
            deviceId = deviceId.requireDeviceId(),
            instrumentType = request.instrumentType,
            symbol = request.symbol,
            action = request.action,
            quantity = request.quantity,
            requestId = request.requestId,
            expectedTurnIndex = request.expectedTurnIndex,
            expectedPrice = request.expectedPrice,
            historyPoints = if (compact) 2 else 24,
        ).toResponse()
    }

    @PostMapping("/preview")
    suspend fun preview(@RequestHeader("X-Device-Id", required = false) deviceId: String?, @Valid @RequestBody request: GameTradeRequest): com.firewatch.backend.service.GameOrderPreview = measured(GameTimingOperation.PREVIEW) {
        gameService.preview(deviceId.requireDeviceId(), request.instrumentType, request.symbol, request.action, request.quantity, request.expectedTurnIndex)
    }

    @PostMapping("/next-turn")
    suspend fun nextTurn(@RequestHeader("X-Device-Id", required = false) deviceId: String?, @RequestBody(required = false) body: Map<String, Int>?, @RequestParam(defaultValue = "false") compact: Boolean): GameTurnResponse =
        measured(GameTimingOperation.NEXT_TURN) { gameService.nextTurn(deviceId.requireDeviceId(), body?.get("expectedTurnIndex"), if (compact) 2 else 24).toResponse() }

    @PostMapping("/end")
    suspend fun end(@RequestHeader("X-Device-Id", required = false) deviceId: String?, @RequestParam(defaultValue = "false") compact: Boolean): GameTurnResponse =
        measured(GameTimingOperation.END) { gameService.endGame(deviceId.requireDeviceId(), if (compact) 2 else 24).toResponse() }
}

data class GameAssetHistoryResponse(val sessionId: Long, val turnIndex: Int, val history: com.firewatch.backend.service.GameAssetHistory)
