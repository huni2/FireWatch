package com.firewatch.backend

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

// Design Ref: §2.2 — SchedulerJob의 @Scheduled(cron 08:00 KST)를 활성화
@EnableScheduling
@SpringBootApplication
class BackendApplication

fun main(args: Array<String>) {
	runApplication<BackendApplication>(*args)
}
