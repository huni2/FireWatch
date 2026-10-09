// 기업 이름의 한글 초성 변환과 영어·비한글 보존을 검증한다.
package com.firewatch.backend.repository

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class CatalogInitialsTest {
    @Test fun `초성 열이 없던 기존 H2 테이블에 반복 스키마 적용해도 원래 행은 유지된다`() {
        val dataSource = org.springframework.jdbc.datasource.DriverManagerDataSource("jdbc:h2:mem:initials-legacy;DB_CLOSE_DELAY=-1", "sa", "")
        val jdbc = org.springframework.jdbc.core.JdbcTemplate(dataSource)
        jdbc.execute("CREATE TABLE instrument_catalog (symbol VARCHAR(20) PRIMARY KEY, name VARCHAR(160) NOT NULL, normalized_name VARCHAR(160) NOT NULL, search_text TEXT NOT NULL, metadata_json TEXT NOT NULL, asset_class VARCHAR(20) NOT NULL, region VARCHAR(20) NOT NULL, sector_id VARCHAR(40) NOT NULL, underlying_index VARCHAR(80) NOT NULL, verified_at DATE NOT NULL)")
        jdbc.update("INSERT INTO instrument_catalog VALUES ('LEGACY','편집 기업','편집기업','원래 검색','원래 설명','STOCK','KR','unclassified','','2026-10-09')")
        val original = jdbc.queryForList("SELECT * FROM instrument_catalog").single()
        val catalogSchema = org.springframework.core.io.ClassPathResource("portfolio-h2.sql").inputStream.use { it.readBytes().toString(Charsets.UTF_8) }
            .substringBefore("CREATE TABLE IF NOT EXISTS market_quotes")
        repeat(2) { dataSource.connection.use { connection ->
            org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(connection, org.springframework.core.io.ByteArrayResource(catalogSchema.toByteArray()))
        } }
        val migrated = jdbc.queryForList("SELECT * FROM instrument_catalog").single()
        assertEquals("", migrated["name_initials"])
        assertEquals(original, migrated.filterKeys { !it.equals("name_initials", ignoreCase = true) })
    }
    @Test fun `실제 회사명과 복합 자음 및 한글 양끝을 변환한다`() {
        assertEquals("ㅅㅅㅈㅈ", InstrumentCatalog.initials("삼성전자"))
        assertEquals("skㅎㅇㄴㅅ", InstrumentCatalog.initials("SK 하이닉스"))
        assertEquals("ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", InstrumentCatalog.initials("가까나다따라마바빠사싸아자짜차카타파하"))
        assertEquals("ㄱㅎ", InstrumentCatalog.initials("가힣"))
        assertEquals("nvidia123😀", InstrumentCatalog.initials("NVIDIA 123😀"))
        assertEquals("", InstrumentCatalog.initials(" &._- "))
    }
}
