package com.firewatch.backend.service

import com.firewatch.backend.entity.*
import com.firewatch.backend.repository.PortfolioRepository
import com.firewatch.backend.repository.PortfolioRevisionRepository
import com.firewatch.backend.web.ApiException
import com.firewatch.backend.web.ValidationException
import com.firewatch.backend.web.dto.*
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper
import java.math.BigDecimal
import java.security.MessageDigest
import java.time.Instant

data class AccountRecordSnapshot(val holdings: List<PortfolioHoldingInput>, val cash: BigDecimal, val watchedStocks: List<String>, val goal: String, val accountType: String, val watchedNames: Map<String, String> = emptyMap(), val noteCount: Int = 0)
data class AccountRecordComparison(val fingerprint: String, val device: AccountRecordSnapshot, val account: AccountRecordSnapshot) {
    override fun toString() = "계정 연결 기록 비교 (내용 비공개)"
}

// Invoked inside the Google verification/link transaction. No linking or writes until consent.
@Service
class AccountRecordLinkService(
    private val portfolios: PortfolioRepository,
    private val revisions: PortfolioRevisionRepository,
    private val portfolioService: PortfolioService,
    private val entityManager: EntityManager,
    private val catalog: com.firewatch.backend.repository.InstrumentCatalog,
) {
    private val mapper = JsonMapper.builder().findAndAddModules().build()
    private fun holdings(row: Portfolio?) = row?.let { mapper.readValue(it.holdingsJson, Array<PortfolioHoldingInput>::class.java).toList() }.orEmpty()
    private fun stocks(settings: UserSettings) = settings.watchedStocks().map { it.trim().uppercase() }.filter { it.isNotBlank() }.distinct()
    private fun notes(row: Portfolio?) = row?.holdingNotesJson?.let { mapper.readValue(it, Array<HoldingNote>::class.java).toList() }.orEmpty()
    private fun snapshot(settings: UserSettings, row: Portfolio?, names: Map<String, String>) = AccountRecordSnapshot(holdings(row), row?.cash ?: BigDecimal.ZERO, stocks(settings), row?.goal ?: "장기 자산 형성", row?.accountType ?: "GENERAL", names, notes(row).size)

    fun resolve(device: UserSettings, account: UserSettings, choice: AccountRecordChoice?) {
        // Refresh already-loaded settings under locks; otherwise a concurrent watch-list edit
        // could be overwritten by a comparison computed before obtaining the lock.
        listOf(device, account).sortedBy { it.id }.forEach { entityManager.refresh(it, LockModeType.PESSIMISTIC_WRITE) }
        val locked = listOf(device.id, account.id).sorted().associateWith { portfolios.findForAccountLink(it) }
        val source = locked[device.id]
        val target = locked[account.id]
        val names = catalog.namesFor(stocks(device) + stocks(account))
        val deviceSnapshot = snapshot(device, source, names)
        val accountSnapshot = snapshot(account, target, names)
        // An empty saved portfolio is not an asset conflict. Deleting its last holding must
        // not permanently block login. New guest watch symbols still need a choice.
        val hasAssets = deviceSnapshot.holdings.isNotEmpty() || deviceSnapshot.cash > BigDecimal.ZERO
        val hasNewWatches = deviceSnapshot.watchedStocks.any { it !in accountSnapshot.watchedStocks }
        if (!hasAssets && !hasNewWatches && deviceSnapshot.noteCount == 0) return
        val digestInput = listOf(device.id, account.id, source?.version, target?.version,
            source?.updatedAt, target?.updatedAt, deviceSnapshot, accountSnapshot,
            source?.horizonMonths, source?.riskLevel, source?.monthlyContribution,
            target?.horizonMonths, target?.riskLevel, target?.monthlyContribution)
        val fingerprint = MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(digestInput)).joinToString("") { "%02x".format(it) }
        val comparison = AccountRecordComparison(fingerprint, deviceSnapshot, accountSnapshot)
        if (choice == null || choice.fingerprint != fingerprint) throw ApiException(
            "ACCOUNT_RECORD_CHOICE_REQUIRED", "기기와 계정에 기록이 있어요. 비교한 뒤 연결 방법을 선택해주세요.",
            HttpStatus.CONFLICT, mapOf("comparison" to comparison),
        )
        if (choice.mode !in setOf("ACCOUNT", "MERGE_ACCOUNT", "MERGE_DEVICE") || choice.cashSource !in setOf("ACCOUNT", "DEVICE"))
            throw ValidationException("기록 연결 방법을 다시 선택해주세요.", emptyMap())
        if (choice.mode == "ACCOUNT") return // Guest source remains untouched; no implicit deletion.

        val mergedWatches = (accountSnapshot.watchedStocks + deviceSnapshot.watchedStocks).distinct()
        if (mergedWatches.size > 20) throw ValidationException("합친 관심 기업이 20개를 넘어요. 기기의 관심 기업을 정리한 뒤 다시 연결하거나 계정 기록으로 로그인해주세요.", emptyMap())

        if (hasAssets || deviceSnapshot.noteCount > 0) {
            val base = target ?: Portfolio(ownerId = account.id).also { row ->
                source?.let { row.goal = it.goal; row.horizonMonths = it.horizonMonths; row.riskLevel = it.riskLevel; row.accountType = it.accountType; row.monthlyContribution = it.monthlyContribution }
            }
            val merged = accountSnapshot.holdings.associateBy { it.symbol.trim().uppercase() }.toMutableMap()
            deviceSnapshot.holdings.forEach { holding ->
                val symbol = holding.symbol.trim().uppercase()
                if (symbol !in merged || choice.mode == "MERGE_DEVICE") merged[symbol] = holding.copy(symbol = symbol)
            }
            val cash = if (choice.cashSource == "DEVICE") deviceSnapshot.cash else accountSnapshot.cash
            val input = PortfolioUpdateRequest(base.version, base.goal, base.horizonMonths, base.riskLevel, base.accountType, base.monthlyContribution, cash, merged.values.toList())
            val mergedNotes = notes(target).associateBy { it.symbol }.toMutableMap()
            notes(source).forEach { note -> if (note.symbol !in mergedNotes || choice.mode == "MERGE_DEVICE") mergedNotes[note.symbol] = note }
            if (mergedNotes.size > 100) throw ValidationException("합친 투자 메모가 100개를 넘어요. 메모를 정리하거나 계정 기록만 사용해주세요.", emptyMap())
            base.holdingNotesJson = mapper.writeValueAsString(mergedNotes.values.toList())
            // Keep the existing 50-row, currency/account, amount and precision limits.
            portfolioService.validate(input)
            // Existing account history is normally present; save an explicit pre-merge
            // snapshot too, including legacy rows with no history. Source is preserved.
            target?.let { revisions.save(PortfolioRevision(ownerId = account.id, revision = it.version, snapshotJson = mapper.writeValueAsString(PortfolioUpdateRequest(it.version, it.goal, it.horizonMonths, it.riskLevel, it.accountType, it.monthlyContribution, it.cash, accountSnapshot.holdings)))) }
            base.cash = cash; base.holdingsJson = mapper.writeValueAsString(input.holdings); base.updatedAt = Instant.now()
            val saved = portfolios.saveAndFlush(base)
            revisions.save(PortfolioRevision(ownerId = account.id, revision = saved.version, snapshotJson = mapper.writeValueAsString(input)))
        }
        account.watchedStocksRaw = mergedWatches.joinToString(",").ifBlank { null }
    }
}
