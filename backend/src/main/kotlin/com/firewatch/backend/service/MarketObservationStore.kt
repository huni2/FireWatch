package com.firewatch.backend.service

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.security.MessageDigest
import java.sql.Timestamp
import java.time.Instant

data class MarketObservation(val asset: String, val price: BigDecimal, val unit: String, val source: String, val sourceAsOf: Instant?, val collectedAt: Instant)

@Service
class MarketObservationStore(private val jdbc: JdbcTemplate) {
    fun save(asset: String, price: BigDecimal, unit: String, source: String, sourceAsOf: Instant?, collectedAt: Instant, sampleKey: String): Int {
        require(price.signum() > 0)
        val key = MessageDigest.getInstance("SHA-256").digest("$asset:$sampleKey".toByteArray()).joinToString("") { "%02x".format(it) }
        // First observation is immutable. Retries/backfills cannot rewrite history.
        return jdbc.update("""INSERT INTO market_observations (id, asset, price, unit, source, source_as_of, collected_at)
            SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM market_observations WHERE id=?)""",
            key, asset, price, unit, source, sourceAsOf?.let(Timestamp::from), Timestamp.from(collectedAt), key)
    }
    fun financialValues(snapshot: FinancialSnapshot): Map<String, BigDecimal?> = linkedMapOf(
        "GOLD" to snapshot.goldPrice, "SILVER" to snapshot.silverPrice, "USD_KRW" to snapshot.usdKrw,
        "JPY100_KRW" to snapshot.jpy100Krw, "CNY_KRW" to snapshot.cnyKrw,
        "KOSPI" to snapshot.kospi, "KOSDAQ" to snapshot.kosdaq, "SP500" to snapshot.sp500,
        "NASDAQ" to snapshot.nasdaq, "DOW" to snapshot.dow, "US_BOND_10Y" to snapshot.usBondYield10y, "KR_BOND_10Y" to snapshot.krBondYield10y,
    )
    fun financialUnit(asset: String) = when {
        asset.endsWith("BOND_10Y") -> "%"
        asset.endsWith("KRW") -> "KRW"
        asset in listOf("GOLD", "SILVER") -> "USD/oz"
        else -> "POINT"
    }
}
