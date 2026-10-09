
CREATE TABLE IF NOT EXISTS portfolios (
 owner_id BIGINT PRIMARY KEY, version BIGINT NOT NULL DEFAULT 0,
 goal VARCHAR(120) NOT NULL, horizon_months INT NOT NULL, risk_level VARCHAR(20) NOT NULL,
 account_type VARCHAR(20) NOT NULL, monthly_contribution DECIMAL(16,2) NOT NULL,
 cash DECIMAL(16,2) NOT NULL, holdings_json TEXT NOT NULL, updated_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS instrument_catalog (
 symbol VARCHAR(20) PRIMARY KEY, name VARCHAR(160) NOT NULL, normalized_name VARCHAR(160) NOT NULL,
 search_text TEXT NOT NULL, metadata_json TEXT NOT NULL, asset_class VARCHAR(20) NOT NULL,
 region VARCHAR(20) NOT NULL, sector_id VARCHAR(40) NOT NULL, underlying_index VARCHAR(80) NOT NULL,
 verified_at DATE NOT NULL
);
ALTER TABLE instrument_catalog ADD COLUMN IF NOT EXISTS name_initials VARCHAR(160) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_catalog_filters ON instrument_catalog(asset_class, region, sector_id);
CREATE INDEX IF NOT EXISTS idx_catalog_name ON instrument_catalog(normalized_name);
CREATE TABLE IF NOT EXISTS market_quotes (
 symbol VARCHAR(20) PRIMARY KEY, price DECIMAL(20,4) NOT NULL, as_of TIMESTAMP NOT NULL, collected_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS news_feed (
 id VARCHAR(64) PRIMARY KEY, title VARCHAR(500) NOT NULL, link VARCHAR(1000) NOT NULL,
 description VARCHAR(1000), pub_date TIMESTAMP, collected_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS collection_runs (id VARCHAR(80) PRIMARY KEY, completed_at TIMESTAMP NOT NULL);
CREATE INDEX IF NOT EXISTS idx_news_feed_date ON news_feed(pub_date);
CREATE TABLE IF NOT EXISTS portfolio_revisions (
 id BIGSERIAL PRIMARY KEY, owner_id BIGINT NOT NULL, revision BIGINT NOT NULL, snapshot_json TEXT NOT NULL, created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portfolio_revisions_owner ON portfolio_revisions(owner_id);
ALTER TABLE game_transactions ADD COLUMN IF NOT EXISTS request_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_request ON game_transactions(session_id, request_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_active_device ON game_sessions(device_id) WHERE status = 'ACTIVE';
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_runs ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS game_price_snapshots (id VARCHAR(100) PRIMARY KEY, price DECIMAL(20,4) NOT NULL);
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS simulation_seed BIGINT;
ALTER TABLE game_price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS collection_jobs (
 id VARCHAR(160) PRIMARY KEY, status VARCHAR(20) NOT NULL, failure_count INT NOT NULL DEFAULT 0,
 collected_count INT NOT NULL DEFAULT 0, last_attempt_at TIMESTAMP, last_success_at TIMESTAMP,
 next_attempt_at TIMESTAMP, lease_until TIMESTAMP, lease_token VARCHAR(64), error_code VARCHAR(80)
);
CREATE TABLE IF NOT EXISTS market_observations (
 id VARCHAR(64) PRIMARY KEY, asset VARCHAR(40) NOT NULL, price DECIMAL(20,6) NOT NULL,
 unit VARCHAR(20) NOT NULL, source VARCHAR(30) NOT NULL, source_as_of TIMESTAMP, collected_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_market_observation_asset ON market_observations(asset, collected_at);
ALTER TABLE collection_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_observations ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS collection_circuits (id VARCHAR(80) PRIMARY KEY, failure_count INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS collection_alerts (
 id VARCHAR(80) PRIMARY KEY, category VARCHAR(20) NOT NULL, message VARCHAR(300) NOT NULL,
 paused BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL, resolved_at TIMESTAMP
);
ALTER TABLE collection_circuits ENABLE ROW LEVEL SECURITY; ALTER TABLE collection_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_circuits ADD COLUMN IF NOT EXISTS lease_token VARCHAR(64);
ALTER TABLE collection_circuits ADD COLUMN IF NOT EXISTS lease_until TIMESTAMP;
ALTER TABLE collection_circuits ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP;
CREATE TABLE IF NOT EXISTS collection_operator (id INT PRIMARY KEY, settings_id BIGINT NOT NULL);
ALTER TABLE collection_alerts ADD COLUMN IF NOT EXISTS push_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE collection_alerts ADD COLUMN IF NOT EXISTS notify_after TIMESTAMP;
ALTER TABLE collection_alerts ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;
ALTER TABLE collection_operator ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS recommendation_details TEXT;

CREATE TABLE IF NOT EXISTS recommendation_reports (analysis_date DATE PRIMARY KEY, source_briefing_date DATE NOT NULL, analyzed_at TIMESTAMP NOT NULL, report_json TEXT NOT NULL);
ALTER TABLE recommendation_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash VARCHAR(64) PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  user_id BIGINT NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_device ON auth_sessions(device_id);
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- 기존 게임의 기업/난수 규칙을 버전1로 보존하며 재실행 시 값을 바꾸지 않는다.
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS simulation_version INT NOT NULL DEFAULT 1;
