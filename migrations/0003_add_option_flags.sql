-- ガード加工・ビンテージオプションフラグを追加
ALTER TABLE diagnosis_logs ADD COLUMN ans_option_guard   INTEGER DEFAULT 0;
ALTER TABLE diagnosis_logs ADD COLUMN ans_option_vintage INTEGER DEFAULT 0;
