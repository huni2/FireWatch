plugins {
	kotlin("jvm") version "2.3.21"
	kotlin("plugin.spring") version "2.3.21"
	id("org.springframework.boot") version "4.1.0"
	id("io.spring.dependency-management") version "1.1.7"
	kotlin("plugin.jpa") version "2.3.21"
}

group = "com.firewatch"
version = "0.0.1-SNAPSHOT"
description = "FireWatch backend - scheduler, Gemini/financial API integration, audit log"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-h2console")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webflux")
	// Design Ref: §2.0 — AuditLogAspect(AOP). Boot 4에서 spring-boot-starter-aop가 없어져 원본 모듈을 직접 추가.
	implementation("org.springframework:spring-aspects")
	implementation("io.projectreactor.kotlin:reactor-kotlin-extensions")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")
	implementation("tools.jackson.module:jackson-module-kotlin")
	// Design Ref: 웹 푸시 확장(2026-08-24) — VAPID 서명·페이로드 암호화(RFC 8291/8292) 직접 구현 대신 검증된 라이브러리 사용.
	implementation("nl.martijndwars:web-push:5.1.2")
	// web-push가 선언한 bcprov는 optional=true라 전이 포함이 안 돼 직접 추가(EC 키 로딩에 "BC" provider 필요).
	implementation("org.bouncycastle:bcprov-jdk18on:1.80")
	// web-push의 httpasyncclient는 runtime scope라 PushService.send()의 반환 타입(HttpResponse)이
	// 컴파일 타임에 안 보임 — implementation으로 승격.
	implementation("org.apache.httpcomponents:httpasyncclient:4.1.5")
	runtimeOnly("com.h2database:h2")
	// prod 프로필(Render)에서 Supabase Postgres 연결용 — ADR 0009
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webflux-test")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test")
	testImplementation("io.mockk:mockk:1.14.3") // Design Ref: §8 Test Plan
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
	compilerOptions {
		freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
	}
}

allOpen {
	annotation("jakarta.persistence.Entity")
	annotation("jakarta.persistence.MappedSuperclass")
	annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
	useJUnitPlatform()
}
