-- Design Ref: docs/02-design/features/firewatch.design.md §3.1
-- 로컬 개발/테스트용 H2 DDL. 프로덕션(Render)은 schema-postgresql.sql — ADR 0009.

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
  kospi DECIMAL(12,2),                 -- 2026-08-23 사용자 요청 — 국내외 지수 + 미국채 수익률
  kosdaq DECIMAL(12,2),
  sp500 DECIMAL(12,2),
  nasdaq DECIMAL(12,2),
  dow DECIMAL(12,2),
  us_bond_yield_10y DECIMAL(6,3),
  data_source_status VARCHAR(20) NOT NULL, -- NORMAL, FALLBACK
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 기존에 만들어진 테이블에도 새 컬럼을 추가(신규 설치는 위 CREATE TABLE에 이미 포함돼 무해).
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS kospi DECIMAL(12,2);
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS kosdaq DECIMAL(12,2);
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS sp500 DECIMAL(12,2);
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS nasdaq DECIMAL(12,2);
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS dow DECIMAL(12,2);
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS us_bond_yield_10y DECIMAL(6,3);

-- 설계 문서 원본엔 없던 테이블 — 사용자 요청(2026-08-21)으로 추가. Gemini Search Grounding이
-- 무료 티어에서 막혀 있어 네이버 뉴스 검색 API로 실제 기사 링크를 대신 제공한다.
CREATE TABLE IF NOT EXISTS briefing_news (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  briefing_id BIGINT NOT NULL,
  title VARCHAR(500) NOT NULL,
  link VARCHAR(1000) NOT NULL,
  description VARCHAR(1000),
  pub_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT PRIMARY KEY,
  push_time VARCHAR(5) NOT NULL DEFAULT '08:00',
  interest_keywords TEXT,              -- 쉼표 구분 문자열
  fcm_tokens TEXT,                     -- 쉼표 구분 문자열 (Phase 2에서 실사용)
  watched_stocks TEXT,                 -- 쉼표 구분 문자열, 관심 종목 티커(예: 005930.KS,AAPL)
  web_push_subscriptions TEXT,         -- JSON 배열 문자열, 브라우저 Web Push 구독 정보(endpoint+keys)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 기존에 만들어진 테이블에도 새 컬럼을 추가(신규 설치는 위 CREATE TABLE에 이미 포함돼 무해).
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS watched_stocks TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS web_push_subscriptions TEXT;

MERGE INTO user_settings (id, push_time, interest_keywords, fcm_tokens)
  KEY (id) VALUES (1, '08:00', '', '');
