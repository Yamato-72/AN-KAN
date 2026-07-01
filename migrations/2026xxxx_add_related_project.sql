-- ============================================================
-- 修理案件（TS等）を「元の案件（AD）」に紐づける列を追加する
--   related_project_id … 親案件の projects.id を指す（AD番号ではなくID）
--   なぜIDか: AD番号は後から変更できるため、番号で持つとリンクが切れる。
--            IDで持てば番号を振り直しても関係が保たれる。
--   NULL可: 通常の案件（親を持たない）は空のまま。
-- Neonでこのまま流してください。IF NOT EXISTS 付きで二度流しても安全。
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS related_project_id INTEGER;

-- 「この親案件にぶら下がる修理一覧」を速く引くための索引
CREATE INDEX IF NOT EXISTS projects_related_project_id_idx
  ON projects (related_project_id);
