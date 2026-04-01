CREATE TABLE IF NOT EXISTS diagnosis_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  grade       TEXT NOT NULL,           -- A / B / C
  score       INTEGER NOT NULL,        -- 合計スコア
  duration_sec INTEGER,               -- 所要時間（秒）
  session_id  TEXT,                    -- セッションID
  referrer    TEXT,                    -- 参照元URL
  -- 各回答
  ans_material      TEXT,
  ans_silk_fabric   TEXT,
  ans_fabric        TEXT,
  ans_tailoring     TEXT,
  ans_decoration    TEXT,
  ans_water_history TEXT,
  ans_past_result   TEXT,
  ans_color         TEXT,
  -- テストフラグ
  is_test     INTEGER DEFAULT 0        -- 1=テストデータ
);

CREATE INDEX IF NOT EXISTS idx_grade      ON diagnosis_logs(grade);
CREATE INDEX IF NOT EXISTS idx_created_at ON diagnosis_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_session    ON diagnosis_logs(session_id);
