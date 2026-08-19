package com.firewatch.backend.audit

/**
 * Design Ref: §3.2(감사로그 client_ip) — WebFlux는 Service 계층에서 HTTP 요청 컨텍스트를
 * ThreadLocal로 안전하게 읽을 수 없다(리액티브 스레드 홉핑). 그래서 Controller가 IP를 command
 * 객체에 실어 넘기고, [AuditLogAspect]가 인자 중 이 인터페이스 구현체를 찾아 client_ip 컬럼에 채운다.
 */
interface HasClientIp {
    val clientIp: String?
}
