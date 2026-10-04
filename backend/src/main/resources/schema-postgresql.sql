-- Design Ref: docs/02-design/features/firewatch.design.md §3.1
-- 프로덕션(Render)용 PostgreSQL DDL. H2와 동일 스키마, AUTO_INCREMENT/MERGE만 Postgres 문법으로 교체 — ADR 0009.

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
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
  id BIGSERIAL PRIMARY KEY,
  briefing_date DATE NOT NULL UNIQUE,
  market_summary TEXT NOT NULL,
  recommended_stocks TEXT,             -- 쉼표 구분 문자열(단순화 — Design §3.1 "JSON" 표기에서 변경, Do 단계 판단)
  trending_keywords TEXT,              -- 쉼표 구분 문자열, 관심 키워드 추천용(2026-09-01 사용자 요청)
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
  kr_bond_yield_10y DECIMAL(6,3),       -- 2026-10-02 — 한국은행 ECOS Open API로 확보(BE-10)
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
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS trending_keywords TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS kr_bond_yield_10y DECIMAL(6,3);

-- 설계 문서 원본엔 없던 테이블 — 사용자 요청(2026-08-21)으로 추가. Gemini Search Grounding이
-- 무료 티어에서 막혀 있어 네이버 뉴스 검색 API로 실제 기사 링크를 대신 제공한다.
CREATE TABLE IF NOT EXISTS briefing_news (
  id BIGSERIAL PRIMARY KEY,
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

INSERT INTO user_settings (id, push_time, interest_keywords, fcm_tokens)
  VALUES (1, '08:00', '', '')
  ON CONFLICT (id) DO NOTHING;

-- 공개 배포 전환(2026-09) — 기기별 익명 저장이 기본, Google 계정 연동은 선택(entity/UserSettings.kt 참고).
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS device_id VARCHAR(64) UNIQUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS last_notified_date DATE;
-- 기존 유일한 행(소유자, id=1)에 고정 device_id를 부여 — 웹 클라이언트가 로컬에 deviceId가 없으면
-- 이 값으로 폴백해 기존 설정을 그대로 이어받는다(web/src/lib/deviceId.ts 참고).
UPDATE user_settings SET device_id = 'legacy-owner-device' WHERE id = 1 AND device_id IS NULL;

CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  google_sub VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_links (
  device_id VARCHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BE-13(2026-10-04 앱 리뷰) — AI 추천종목 가상매매 트래킹. 같은 종목이 여러 날 반복 추천되면
-- 매번 새 행(중복 제거 안 함, entity/RecommendedStockSnapshot.kt 참고).
CREATE TABLE IF NOT EXISTS recommended_stock_snapshots (
  id BIGSERIAL PRIMARY KEY,
  briefing_date DATE NOT NULL,
  stock_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(20),
  price_at_recommendation DECIMAL(16,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supabase Security Advisor(RLS Disabled in Public) 대응 — 백엔드는 BYPASSRLS 권한을 가진
-- postgres 계정(Session Pooler)으로 접속해 영향 없음. PostgREST(anon/authenticated) 경로만 차단.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefing_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommended_stock_snapshots ENABLE ROW LEVEL SECURITY;
