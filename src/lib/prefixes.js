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

// 接頭辞ごとの採番フロア（起点）
//   在庫シート等で既に発番済みの実績に合わせ、ANKANの自動採番の下限を決める。
//   採番は「max(この値, DB上のその接頭辞の最大番号) + 1」で出す。
//   実績が進んだら、ここの数字を更新する（例: TSがさらに進んだら上げる）。
//     TS … 在庫シートの最新 TS-0076 に合わせる → 次は 0077 から
//     SP … 現在の最新 SP-1000 に合わせる       → 次は 1001 から
export const PREFIX_NUMBER_FLOOR = {
  TS: 76,
  SP: 1000,
};

// 受け取った接頭辞を正規化する（大文字化＋許可リスト外はデフォルトに丸める）
export function normalizePrefix(raw) {
  if (raw === null || raw === undefined) return DEFAULT_PREFIX;
  const up = String(raw).trim().toUpperCase();
  return PROJECT_PREFIXES.includes(up) ? up : DEFAULT_PREFIX;
}

// 4桁ゼロ埋めする接頭辞（在庫シート側が4桁なので揃える）。ADは従来通り桁数そのまま
export const ZERO_PADDED_PREFIXES = ["TS", "SP"];

// 表示用フォーマット：prefix + 番号
//   TS/SP … 4桁ゼロ埋め（例 TS-0074）
//   AD    … 従来通り桁数そのまま（例 AD-905）
export function formatProjectNumber(prefix, adNumber) {
  const p = normalizePrefix(prefix);
  if (adNumber === null || adNumber === undefined || adNumber === "") return "";
  const num = ZERO_PADDED_PREFIXES.includes(p)
    ? String(adNumber).padStart(4, "0")
    : String(adNumber);
  return `${p}-${num}`;
}
