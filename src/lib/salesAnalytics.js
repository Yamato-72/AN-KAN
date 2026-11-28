// ============================================================
// 売上分析の共通ルール（売上分析ページと、ダッシュボードの「自分の今期」で使う）
// ============================================================

export const FY_BASE_YEAR = 2019; // 1期 = 2019年7月〜

// 案件の期を判定（納期 → 問い合わせ日 → 作成日）
export const periodOf = (p) => {
  const dateStr = p.sales_date || p.delivery_date || p.inquiry_date || p.created_at; // 売上の納品日（支払ナビ）を最優先
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const fyStartYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return fyStartYear - FY_BASE_YEAR + 1;
};

// 会計月インデックス（7月=0 … 6月=11）と表示名
export const fiscalMonthOf = (p) => {
  const dateStr = p.sales_date || p.delivery_date || p.inquiry_date || p.created_at; // 売上の納品日（支払ナビ）を最優先
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return (d.getMonth() + 6) % 12;
};
export const FISCAL_MONTH_LABELS = ["7月","8月","9月","10月","11月","12月","1月","2月","3月","4月","5月","6月"];

// 案件の段階（売上分析での呼び方）
//   商談中＝リード・打ち合わせ中（まだ受注していない）
//   仕掛り＝受注済み・手配中（受注したが、まだ完了していない）
//   完了　＝残金請求済
//   トラブル対応＝TS（修理・トラブル対応。営業の件数には入れず別枠で数える）
//   SP（在庫の発注）は売上ではないので、売上分析には入れない
export const prefixOf = (p) => String(p.prefix || "AD").toUpperCase();
export const stageOf = (p) => {
  if (prefixOf(p) === "TS") return "トラブル対応";
  if (p.status === "残金請求済") return "完了";
  if (p.status === "リード" || p.status === "打ち合わせ中") return "商談中";
  return "仕掛り";
};
export const STAGES = ["完了", "仕掛り", "商談中", "トラブル対応"];
export const isOrdered = (p) => p._stage === "完了" || p._stage === "仕掛り"; // 営業で受注した案件

export const yen = (n) => "¥" + Math.round(n).toLocaleString();
export const man = (n) => {
  const v = Math.round(n);
  if (Math.abs(v) >= 100000000) return "¥" + (Math.round(v / 1000000) / 100).toLocaleString() + "億";
  if (Math.abs(v) >= 10000) return "¥" + Math.round(v / 10000).toLocaleString() + "万";
  return "¥" + v.toLocaleString();
};


// 案件に期・売上・段階を付け、SP（在庫の発注）を除く
export const prepareSales = (projects) =>
  (projects || [])
    .map((p) => ({
      ...p,
      _period: periodOf(p),
      _rev: Number(p.revenue ?? 0) || 0,
      _fm: fiscalMonthOf(p),
      _stage: stageOf(p),
    }))
    .filter((p) => p._period && p._period > 0 && prefixOf(p) !== "SP");

export const staffOf = (p) => p.assigned_team_member_name || "担当者なし";
