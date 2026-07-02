-- 受注アラート（調達へのメール通知）を送ったかどうかを記録する列
--   - 初回の「受注済み」到達時にだけメールを送るための印
--   - 既存案件は false（未送信）から始まる。過去案件に今さらアラートは飛ばない
--     （下の UPDATE で、既に受注以降まで進んでいる案件は「送信済み」扱いにして、
--       これから受注に動かしても過去分に通知が飛ばないようにする）

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS order_alert_sent BOOLEAN NOT NULL DEFAULT false;

-- すでに受注済み以降まで進んでいる案件は、過去分なので「送信済み」にしておく。
-- （これをやらないと、旧案件のステータスをうっかり動かした瞬間にアラートが飛ぶ）
UPDATE projects
SET order_alert_sent = true
WHERE status IN ('受注済み', '国際発注済', '設置手配済', '設置完了', '残金請求済');
