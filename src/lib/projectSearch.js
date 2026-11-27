// ============================================================
// 案件の検索（ダッシュボード・プロジェクト一覧・失注保留で共通）
//   - 全角/半角・大文字/小文字・空白・ハイフンの違いは同じとみなす
//       「AD-1840」「ad1840」「1840」「ＡＤ１８４０」→ どれでも当たる
//   - スペースで区切ると「すべて含む」（例：「大阪 LED」）
//   - 見る項目：案件番号、プロジェクト名、顧客名、担当者、設置場所・住所、
//               品番、備考、顧客の担当者・住所、設置業者、ステータス
// ============================================================
import { formatProjectNumber } from "@/lib/prefixes";

const norm = (s) =>
  String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-‐－ー_/／・]/g, "");

function haystack(p) {
  const label = p.ad_number != null ? formatProjectNumber(p.prefix, p.ad_number) : "";
  return norm(
    [
      label,
      `${p.prefix || ""}${p.ad_number ?? ""}`,
      p.project_name,
      p.client_name,
      p.assigned_team_member_name,
      p.location,
      p.address,
      p.product_number,
      p.remarks,
      p.contact_person,
      p.company_address,
      p.installation_contractor,
      p.installation_contractor2,
      p.status,
    ].join("|"),
  );
}

export function matchesProjectSearch(project, query) {
  const words = String(query || "")
    .normalize("NFKC")
    .split(/\s+/)
    .map(norm)
    .filter(Boolean);
  if (!words.length) return true;
  const h = haystack(project);
  return words.every((w) => h.includes(w));
}
