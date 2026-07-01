-- ============================================================
-- projects テーブルに「接頭辞（prefix）」を導入する
--   目的: AD だけでなく SP / TS も振れるようにする
--   考え方: ad_number は「番号」としてそのまま使い、prefix を1本足す
--   安全性: 既存の案件はすべて 'AD' で埋まるので、今の表示・挙動は変わらない
-- Neon（本番PostgreSQL）でこのSQLを流してください。IF NOT EXISTS 付きなので
-- 二度流しても壊れません。
-- ============================================================

-- 1) prefix 列を追加（既定 'AD'、NULL禁止）。既存行は自動で 'AD' が入る。
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS prefix TEXT NOT NULL DEFAULT 'AD';

-- 2) 「接頭辞 + 番号」の組で重複禁止にする（複合ユニーク）。
--    AD-0001 と SP-0001 は別物としてOK。ただし AD-0001 が2つはNG。
--    ad_number が未設定（NULL）の行は対象外にする（部分インデックス）。
CREATE UNIQUE INDEX IF NOT EXISTS projects_prefix_adnumber_uniq
  ON projects (prefix, ad_number)
  WHERE ad_number IS NOT NULL;

-- 3) 接頭辞での絞り込みを速くする補助インデックス（任意だが安い）。
CREATE INDEX IF NOT EXISTS projects_prefix_idx
  ON projects (prefix);
