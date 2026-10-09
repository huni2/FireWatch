// 게임 준비가 실제 코덱으로 가상 응답을 처리하고 주문 검증을 유지하는지 확인한다.
package com.firewatch.backend.web

import com.firewatch.backend.entity.GameInstrumentType
import com.firewatch.backend.entity.GameTradeAction
import com.firewatch.backend.web.dto.GameTradeRequest
import com.firewatch.backend.web.dto.GameTurnResponse
import jakarta.validation.Validation
import org.junit.jupiter.api.Test
import org.springframework.http.codec.ServerCodecConfigurer
import org.springframework.http.codec.json.JacksonJsonDecoder
import org.springframework.http.codec.json.JacksonJsonEncoder
import tools.jackson.databind.json.JsonMapper
import java.math.BigDecimal
import kotlin.test.*

class GameRuntimePreparationTest {
    @Test fun `preparation uses configured codec and keeps invalid quantities rejected`() {
        val mapper = JsonMapper.builder().findAndAddModules().build()
        val codecs = ServerCodecConfigurer.create().apply {
            defaultCodecs().jacksonJsonEncoder(JacksonJsonEncoder(mapper))
            defaultCodecs().jacksonJsonDecoder(JacksonJsonDecoder(mapper))
        }
        Validation.buildDefaultValidatorFactory().use { factory ->
            val preparation = GameRuntimePreparation(codecs, factory.validator)
            assertFalse(preparation.prepared)
            preparation.afterSingletonsInstantiated()
            assertTrue(preparation.prepared)
            val startMethod = com.firewatch.backend.service.GameService::class.java.declaredMethods.single { it.name == "startGame" }
            assertEquals(listOf("deviceId", "difficulty", "allowShortSelling", "historyPoints"),
                org.springframework.core.DefaultParameterNameDiscoverer.getSharedInstance().getParameterNames(startMethod)!!.toList())
            val sample = preparation.sampleResponse()
            val decoded = mapper.readValue(mapper.writeValueAsBytes(sample), GameTurnResponse::class.java)
            assertEquals(-1, decoded.sessionId)
            assertEquals(26, decoded.gameAssets.size)
            assertTrue(decoded.simulation)
            assertEquals(sample.stockPrices, decoded.stockPrices)
            assertTrue(decoded.briefing.news.isNotEmpty())
            assertTrue(decoded.gamePicks.isNotEmpty())
            assertEquals(34, decoded.assetHistories.size)
            assertEquals(sample.transactions, decoded.transactions)
            val request = GameTradeRequest(GameInstrumentType.GOLD, action = GameTradeAction.BUY, quantity = BigDecimal.ZERO)
            assertEquals(setOf("quantity"), factory.validator.validate(request).map { it.propertyPath.toString() }.toSet())
            assertTrue(factory.validator.validate(request.copy(quantity = BigDecimal.ONE)).isEmpty())
        }
    }
}
