package com.firewatch.backend.web

import com.firewatch.backend.repository.InstrumentCatalog
import com.firewatch.backend.repository.CatalogPage
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
class CatalogController(private val catalog: InstrumentCatalog) {
    @GetMapping("/api/catalog")
    fun search(@RequestParam(defaultValue = "") q: String, @RequestParam(defaultValue = "") assetClass: String,
               @RequestParam(defaultValue = "") region: String, @RequestParam(defaultValue = "") sectorId: String,
               @RequestParam(defaultValue = "0") page: Int): CatalogPage {
        if (page !in 0..10000) throw ValidationException("카탈로그 페이지 범위를 확인해주세요.", mapOf("page" to "0~10000 범위로 입력해주세요."))
        return catalog.search(q, assetClass, region, sectorId, 50, page)
    }
}
