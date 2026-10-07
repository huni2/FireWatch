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
               @RequestParam(defaultValue = "") region: String, @RequestParam(defaultValue = "") sectorId: String): CatalogPage = catalog.search(q, assetClass, region, sectorId, 50)
}
