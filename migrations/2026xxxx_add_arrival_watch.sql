-- 入荷予定日の通知用：支払ナビの入荷予定日を、前回いくつだったか覚えておく表
--   - /api/projects/arrival-check が初回に自動で作るので、手で流さなくても動く（記録用）
--   - env: 'prod'（本番シート）/'test'（【テスト】シート）を分けて覚える
CREATE TABLE IF NOT EXISTS arrival_watch (
  env TEXT NOT NULL DEFAULT 'prod',
  prefix TEXT NOT NULL,
  number INTEGER NOT NULL,
  arrival_date TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (env, prefix, number)
);
