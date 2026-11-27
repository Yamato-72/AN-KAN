import sql from "@/app/api/utils/sql";
import { normalizeProjectNumber } from "@/app/api/utils/salesSheet";
import { loadStock } from "@/app/api/utils/stockState";

// ============================================================
// 受注済み → 手配中 を自動で進める（10分おきの確認のついでに呼ぶ）
//   きっかけ：サプライヤーへ1回でも支払った（支払ナビ）／在庫からこの案件に引き当てた（在庫ナビ）
//   失注・保留の案件は動かさない。理由はアクティビティに残す
// ============================================================
export async function autoAdvanceToArranging({ dry = false } = {}) {
  const { rows, paid } = await loadStock();
  const allocated = new Set(rows.filter((r) => r.ship).map((r) => r.ship));
  const cands = await sql`
    SELECT id, prefix, ad_number, project_name FROM projects
    WHERE status = '受注済み' AND COALESCE(lost_flag,false) = false AND COALESCE(hold_flag,false) = false
  `;
  const moved = [];
  for (const p of cands) {
    const key = normalizeProjectNumber(`${p.prefix || "AD"}-${p.ad_number}`);
    if (!key || /^SP-/.test(key)) continue;
    const why = paid.has(key) ? "サプライヤーへの支払いがあったので" : allocated.has(key) ? "在庫から引き当てがあったので" : null;
    if (!why) continue;
    moved.push({ id: p.id, key, why });
    if (dry) continue;
    await sql`UPDATE projects SET status = '手配中', updated_at = NOW() WHERE id = ${p.id} AND status = '受注済み'`;
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${p.id}, 'status_update', ${`ステータスが「受注済み」から「手配中」に変更されました（${why}自動で）`})
    `;
  }
  return moved;
}
