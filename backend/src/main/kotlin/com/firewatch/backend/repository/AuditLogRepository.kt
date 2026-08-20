package com.firewatch.backend.repository

import com.firewatch.backend.entity.AuditLog
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

// Design Ref: §4.2 GET /api/audit-logs — eventType/status/from/to 전부 선택 필터.
// Specification으로 필터링(AuditLogSpecifications) — "IS NULL OR ..." JPQL 패턴은 Postgres가
// 파라미터 타입을 못 정하는 경우가 있어(ADR 0009 이후 실측 확인, could not determine data type of
// parameter) 조건이 있을 때만 predicate를 추가하는 방식으로 교체했다.
interface AuditLogRepository : JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog>
