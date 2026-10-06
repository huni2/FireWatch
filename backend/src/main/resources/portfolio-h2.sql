
CREATE TABLE IF NOT EXISTS portfolios (
 owner_id BIGINT PRIMARY KEY, version BIGINT NOT NULL DEFAULT 0,
 goal VARCHAR(120) NOT NULL, horizon_months INT NOT NULL, risk_level VARCHAR(20) NOT NULL,
 account_type VARCHAR(20) NOT NULL, monthly_contribution DECIMAL(16,2) NOT NULL,
 cash DECIMAL(16,2) NOT NULL, holdings_json TEXT NOT NULL, updated_at TIMESTAMP NOT NULL
);
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
 id BIGINT AUTO_INCREMENT PRIMARY KEY, owner_id BIGINT NOT NULL, revision BIGINT NOT NULL, snapshot_json TEXT NOT NULL, created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portfolio_revisions_owner ON portfolio_revisions(owner_id);
ALTER TABLE game_transactions ADD COLUMN IF NOT EXISTS request_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_request ON game_transactions(session_id, request_id);
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS active_device VARCHAR(100) GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN device_id ELSE NULL END);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_active_device ON game_sessions(active_device);
CREATE TABLE IF NOT EXISTS game_price_snapshots (id VARCHAR(100) PRIMARY KEY, price DECIMAL(20,4) NOT NULL);
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS simulation_seed BIGINT;
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
CREATE TABLE IF NOT EXISTS collection_circuits (id VARCHAR(80) PRIMARY KEY, failure_count INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS collection_alerts (
 id VARCHAR(80) PRIMARY KEY, category VARCHAR(20) NOT NULL, message VARCHAR(300) NOT NULL,
 paused BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL, resolved_at TIMESTAMP
);
ALTER TABLE collection_circuits ADD COLUMN IF NOT EXISTS lease_token VARCHAR(64);
ALTER TABLE collection_circuits ADD COLUMN IF NOT EXISTS lease_until TIMESTAMP;
ALTER TABLE collection_circuits ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP;
CREATE TABLE IF NOT EXISTS collection_operator (id INT PRIMARY KEY, settings_id BIGINT NOT NULL);
ALTER TABLE collection_alerts ADD COLUMN IF NOT EXISTS push_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE collection_alerts ADD COLUMN IF NOT EXISTS notify_after TIMESTAMP;
ALTER TABLE collection_alerts ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS recommendation_details TEXT;
