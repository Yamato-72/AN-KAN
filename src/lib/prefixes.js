// ============================================================
// 案件番号の接頭辞（プレフィックス）定義
//   - ここが唯一の正。フォームの選択肢もAPIの検証もここを見る
//   - 種別を増やすときは、この配列に1行足すだけ
//       AD … 販売案件（商品調達あり／従来のAD）
//       SP … 支払ナビ側の販売案件
//       TS … サービス案件（修理・現調・保守など、調達なし）
// ============================================================

export const PROJECT_PREFIXES = ["AD", "SP", "TS"];

export const DEFAULT_PREFIX = "AD";

// 受け取った接頭辞を正規化する（大文字化＋許可リスト外はデフォルトに丸める）
export function normalizePrefix(raw) {
  if (raw === null || raw === undefined) return DEFAULT_PREFIX;
  const up = String(raw).trim().toUpperCase();
  return PROJECT_PREFIXES.includes(up) ? up : DEFAULT_PREFIX;
}

// 表示用フォーマット：prefix + 番号（例 SP-0074 ではなく SP-74。既存表示に合わせゼロ埋めなし）
export function formatProjectNumber(prefix, adNumber) {
  const p = normalizePrefix(prefix);
  if (adNumber === null || adNumber === undefined || adNumber === "") return "";
  return `${p}-${adNumber}`;
}
