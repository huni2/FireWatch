package com.firewatch.backend.web

import org.springframework.test.context.DynamicPropertyRegistry

/** Opt-in CI database. Reject external URLs so this test can never target Supabase/production. */
object TestDatabase {
    fun configure(registry: DynamicPropertyRegistry) {
        val url = System.getenv("FIREWATCH_TEST_POSTGRES_URL") ?: return
        require(Regex("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):[0-9]+/firewatch_test").matches(url)) { "전용 로컬 테스트 DB만 허용합니다." }
        registry.add("spring.datasource.url") { url }
        registry.add("spring.datasource.driver-class-name") { "org.postgresql.Driver" }
        registry.add("spring.datasource.username") { "firewatch_test" }
        registry.add("spring.datasource.password") { "firewatch_test" }
        registry.add("spring.sql.init.platform") { "postgresql" }
    }
}
