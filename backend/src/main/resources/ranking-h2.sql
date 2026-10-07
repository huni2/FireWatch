CREATE TABLE IF NOT EXISTS game_ranking_profiles (
 user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
 nickname VARCHAR(16) NOT NULL, nickname_key VARCHAR(16) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS game_ranking_entries (
 id VARCHAR(36) PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 session_id BIGINT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
 turn_index INT NOT NULL, board VARCHAR(12) NOT NULL, difficulty VARCHAR(10) NOT NULL,
 short_selling BOOLEAN NOT NULL, week_start DATE NOT NULL, return_percent NUMERIC(24,8) NOT NULL,
 submitted_at TIMESTAMP NOT NULL, visible BOOLEAN NOT NULL DEFAULT TRUE,
 UNIQUE(session_id,turn_index,board)
);
CREATE INDEX IF NOT EXISTS idx_game_ranking_week ON game_ranking_entries(week_start,board,difficulty,short_selling,turn_index);
CREATE TABLE IF NOT EXISTS game_ranking_state (id INT PRIMARY KEY);
INSERT INTO game_ranking_state(id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM game_ranking_state WHERE id=1);
CREATE TABLE IF NOT EXISTS game_ranking_closed_weeks (week_start DATE PRIMARY KEY);
CREATE TABLE IF NOT EXISTS game_ranking_winners (
 week_start DATE NOT NULL, difficulty VARCHAR(10) NOT NULL, short_selling BOOLEAN NOT NULL,
 entry_id VARCHAR(36) NOT NULL REFERENCES game_ranking_entries(id) ON DELETE CASCADE,
 PRIMARY KEY(week_start,difficulty,short_selling)
);
