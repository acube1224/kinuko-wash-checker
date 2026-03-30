-- IPハッシュ（同一人物判別用、元IPは復元不可）
ALTER TABLE diagnosis_logs ADD COLUMN ip_hash TEXT;
-- UA簡易分類（例: "iPhone Safari", "Android Chrome", "PC Chrome"）
ALTER TABLE diagnosis_logs ADD COLUMN device TEXT;

CREATE INDEX IF NOT EXISTS idx_ip_hash ON diagnosis_logs(ip_hash);
