package com.firewatch.backend

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.TestPropertySource

// 로컬 개발용 파일 DB(./data/firewatch)를 테스트가 오염시키지 않도록 전용 인메모리 DB 사용.
@SpringBootTest
@TestPropertySource(properties = ["spring.datasource.url=jdbc:h2:mem:app-context-test;DB_CLOSE_DELAY=-1"])
class BackendApplicationTests {

	@Test
	fun contextLoads() {
	}

}
