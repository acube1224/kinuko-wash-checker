-- 生地チェッカー ログテーブル
CREATE TABLE IF NOT EXISTS fabric_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  nickname        TEXT,
  material_key    TEXT,
  fabric_key      TEXT,
  closest_fabric_key TEXT,
  confidence      TEXT,
  comment         TEXT,
  closest_reason  TEXT,
  image_url_1     TEXT,
  image_url_2     TEXT,
  image_url_3     TEXT,
  is_test         INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_fabric_logs_created_at ON fabric_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_fabric_logs_fabric_key ON fabric_logs(fabric_key);
CREATE INDEX IF NOT EXISTS idx_fabric_logs_is_test    ON fabric_logs(is_test);
