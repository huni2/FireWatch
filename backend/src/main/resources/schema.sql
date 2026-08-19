-- Design Ref: docs/02-design/features/firewatch.design.md §3.1
-- H2용 DDL. DB 엔진 최종 선택은 llm-wiki/OpenQuestions.md 참고(아직 미정 — 로컬 개발은 H2).

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,     -- SCHEDULER, GEMINI_API, FINANCIAL_API, FCM_PUSH, USER_SETTING, ERROR
  action_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,         -- SUCCESS, FAILURE, WARNING, FALLBACK
  execution_time_ms INT,
  request_payload TEXT,
  response_summary TEXT,
  client_ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS briefings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  briefing_date DATE NOT NULL UNIQUE,
  market_summary TEXT NOT NULL,
  recommended_stocks TEXT,             -- 쉼표 구분 문자열(단순화 — Design §3.1 "JSON" 표기에서 변경, Do 단계 판단)
  gold_price DECIMAL(12,2),
  silver_price DECIMAL(12,2),
  usd_krw DECIMAL(10,2),
  jpy100_krw DECIMAL(10,2),
  cny_krw DECIMAL(10,2),
  data_source_status VARCHAR(20) NOT NULL, -- NORMAL, FALLBACK
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT PRIMARY KEY,
  push_time VARCHAR(5) NOT NULL DEFAULT '08:00',
  interest_keywords TEXT,              -- 쉼표 구분 문자열
  fcm_tokens TEXT,                     -- 쉼표 구분 문자열 (Phase 2에서 실사용)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

MERGE INTO user_settings (id, push_time, interest_keywords, fcm_tokens)
  KEY (id) VALUES (1, '08:00', '', '');
