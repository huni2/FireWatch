package com.firewatch.backend.web

import com.firewatch.backend.repository.InstrumentCatalog
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.web.reactive.server.WebTestClient
import kotlin.test.*

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["spring.datasource.url=jdbc:h2:mem:catalog-test;DB_CLOSE_DELAY=-1", "firewatch.scheduler.cron=-"])
class CatalogIntegrationTest {
    companion object {
        @JvmStatic @org.springframework.test.context.DynamicPropertySource
        fun database(registry: org.springframework.test.context.DynamicPropertyRegistry) = TestDatabase.configure(registry)
    }
    @Autowired lateinit var catalog: InstrumentCatalog
    @LocalServerPort var port: Int = 0
    @Test
    fun `한국어 별칭 지수 검색과 상장국 필터를 지원하고 추정 시세를 만들지 않는다`() {
        assertEquals("NVDA", catalog.search("엔비디아").items.first().instrument.symbol)
        assertEquals("NVDA", catalog.search("NVIDIA").items.first().instrument.symbol)
        assertEquals("360750.KS", catalog.search("타이거").items.single().instrument.symbol)
        val us = catalog.search("S&P500", "ETF", "US")
        assertEquals(3, us.total)
        assertTrue(us.items.all { it.price == null && it.quoteAt == null && it.instrument.currency == "USD" })
        assertEquals(2, catalog.search("S&P 500", "ETF", "KR").total)
        assertEquals(0, catalog.search("%_'").total)
        assertEquals(2, catalog.search("", "STOCK", "", "chips").total)
        WebTestClient.bindToServer().baseUrl("http://localhost:$port").build().get().uri("/api/catalog?assetClass=ETF&region=KR").exchange().expectStatus().isOk.expectBody().jsonPath("$.total").isEqualTo(2)
    }
}
