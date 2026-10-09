// 첫 게임 요청의 규칙·JSON·검증 초기화 비용을 서버 준비 단계로 옮긴다.
package com.firewatch.backend.web

import com.firewatch.backend.entity.GameInstrumentType
import com.firewatch.backend.entity.GameSessionStatus
import com.firewatch.backend.entity.GameTradeAction
import com.firewatch.backend.service.*
import com.firewatch.backend.web.dto.*
import jakarta.validation.Validator
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.SmartInitializingSingleton
import org.springframework.core.ResolvableType
import org.springframework.core.DefaultParameterNameDiscoverer
import org.springframework.core.MethodParameter
import org.springframework.core.io.buffer.DataBuffer
import org.springframework.core.io.buffer.DataBufferUtils
import org.springframework.core.io.buffer.DefaultDataBufferFactory
import org.springframework.http.MediaType
import org.springframework.http.codec.DecoderHttpMessageReader
import org.springframework.http.codec.EncoderHttpMessageWriter
import org.springframework.http.codec.ServerCodecConfigurer
import org.springframework.http.codec.json.JacksonJsonDecoder
import org.springframework.http.codec.json.JacksonJsonEncoder
import org.springframework.stereotype.Component
import org.springframework.http.server.reactive.AbstractServerHttpResponse
import org.reactivestreams.Publisher
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import java.time.Duration
import java.math.BigDecimal

@Component
class GameRuntimePreparation(
    private val codecs: ServerCodecConfigurer,
    private val validator: Validator,
) : SmartInitializingSingleton {
    internal final var prepared = false
        private set

    override fun afterSingletonsInstantiated() {
        val started = System.nanoTime()
        // Spring AOP MethodSignature uses this same shared discoverer for audit redaction.
        val metadataStarted = System.nanoTime()
        val names = DefaultParameterNameDiscoverer.getSharedInstance()
        GameService::class.java.declaredMethods.filter { java.lang.reflect.Modifier.isPublic(it.modifiers) && !it.isSynthetic }
            .forEach { names.getParameterNames(it) }
        GameController::class.java.declaredMethods.filter { java.lang.reflect.Modifier.isPublic(it.modifiers) && !it.isSynthetic }
            .forEach {
                names.getParameterNames(it)
                MethodParameter(it, -1).apply { parameterType; genericParameterType }
            }
        val metadataMillis = (System.nanoTime() - metadataStarted) / 1_000_000
        // Prepare the actual HTTP codec instances, not a separate mapper cache.
        @Suppress("UNCHECKED_CAST")
        val writer = codecs.writers.filterIsInstance<EncoderHttpMessageWriter<*>>()
            .first { it.encoder is JacksonJsonEncoder } as EncoderHttpMessageWriter<Any>
        val encoder = writer.encoder as JacksonJsonEncoder
        val decoder = codecs.readers.filterIsInstance<DecoderHttpMessageReader<*>>()
            .map { it.decoder }.filterIsInstance<JacksonJsonDecoder>().first()
        val response = sampleResponse()
        val price = response.stockPrices.values.first()
        for (value in listOf(response, GameOrderPreview(response.turnIndex, GameInstrumentType.STOCK,
            response.gameAssets.first().symbol, GameTradeAction.BUY, BigDecimal.ONE, price, price,
            response.cash.subtract(price), BigDecimal.ONE, true, null))) {
            writer.write(Mono.just(value), ResolvableType.forClass(value.javaClass), MediaType.APPLICATION_JSON,
                PreparationResponse(), emptyMap()).block(Duration.ofSeconds(30))
        }
        for (request in listOf(GameStartRequest(), GameTradeRequest(
            GameInstrumentType.STOCK, response.gameAssets.first().symbol, GameTradeAction.BUY, BigDecimal.ONE,
        ))) {
            val bytes = encoder.mapper.writeValueAsBytes(request)
            // The synchronous decoder consumes/releases its input buffer.
            val decoded = decoder.decode(DefaultDataBufferFactory.sharedInstance.wrap(bytes),
                ResolvableType.forClass(request.javaClass), MediaType.APPLICATION_JSON, emptyMap())
            check(validator.validate(decoded).isEmpty())
        }
        prepared = true
        LoggerFactory.getLogger(javaClass).info("game_runtime_ready preparation_ms={} metadata_ms={}",
            (System.nanoTime() - started) / 1_000_000, metadataMillis)
    }

    // A fixed, disposable fiction: no service, repository, request, or external provider call.
    internal fun sampleResponse(): GameTurnResponse {
        val rules = GameSimulation.forVersion(GameSimulation.CURRENT_VERSION)
        val seed = 1L
        val turn = 1
        val asset = rules.assets.first()
        val price = rules.price(seed, turn, GameInstrumentType.STOCK, asset.symbol)!!
        return GameTurnSnapshot(
            sessionId = -1, status = GameSessionStatus.ACTIVE, turnIndex = turn, totalTurns = 24,
            turnDate = rules.dates(seed)[turn], briefing = rules.briefing(seed, turn, rules.dates(seed)[turn]),
            news = rules.news(seed, turn),
            holdings = listOf(GameHolding(GameInstrumentType.STOCK, asset.symbol, BigDecimal.ONE, price, price)),
            cash = BigDecimal("1000000"), portfolioValue = BigDecimal("1000000").add(price),
            startingCash = BigDecimal("1000000"), allowShortSelling = false,
            simulation = true, simulationVersion = rules.version, gameAssets = rules.metadata,
            stockPrices = rules.assets.associate { it.symbol to rules.price(seed, turn, GameInstrumentType.STOCK, it.symbol)!! },
            marketEvents = listOf(GameMarketEvent("PREPARATION", "가상 준비", "메모리에서만 처리합니다", emptyList())),
            turnContributions = listOf(GameTurnContribution(GameInstrumentType.STOCK, asset.symbol, asset.name,
                BigDecimal.ONE, price, price, BigDecimal.ZERO, "가상 준비")),
            assetHistories = rules.histories(seed, turn), gamePicks = rules.picks(seed, turn),
            priceDrivers = rules.assets.map { rules.driver(seed, turn, GameInstrumentType.STOCK, it.symbol) },
        ).toResponse().copy(transactions = listOf(GameTransactionResponse(-1, turn,
            GameInstrumentType.STOCK, asset.symbol, GameTradeAction.BUY, BigDecimal.ONE, price, price)))
    }
}

// 포트를 열거나 결과를 보관하지 않고 실제 비동기 응답 작성·커밋 경로를 준비한다.
private class PreparationResponse : AbstractServerHttpResponse(DefaultDataBufferFactory.sharedInstance) {
    override fun <T : Any> getNativeResponse(): T = error("메모리 준비 응답에는 네이티브 응답이 없습니다")
    override fun writeWithInternal(body: Publisher<out DataBuffer>): Mono<Void> =
        Flux.from(body).doOnNext { DataBufferUtils.release(it) }.then()
    override fun writeAndFlushWithInternal(body: Publisher<out Publisher<out DataBuffer>>): Mono<Void> =
        Flux.from(body).concatMap { writeWithInternal(it) }.then()
    override fun applyStatusCode() = Unit
    override fun applyHeaders() = Unit
    override fun applyCookies() = Unit
}
