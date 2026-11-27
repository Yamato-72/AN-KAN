import sql from "@/app/api/utils/sql";
import { appendTicketToSpaceName } from "@/app/api/utils/googleChat";
import { formatProjectNumber, normalizePrefix } from "@/lib/prefixes";

// ============================================================
// TS 案件に関連AD が付いたら、AD のスペース名に TS 番号を足し、両方の案件にログを残す
//   - 失敗しても案件の登録・更新は止めない（呼び出し側は await してもエラーにならない）
// ============================================================
export async function linkTicketToAdSpace(tsProjectId, relatedProjectId) {
  try {
    if (!relatedProjectId) return null;
    const [ts] = await sql`SELECT id, prefix, ad_number FROM projects WHERE id = ${tsProjectId}`;
    const [ad] = await sql`SELECT id, prefix, ad_number FROM projects WHERE id = ${relatedProjectId}`;
    if (!ts || !ad || normalizePrefix(ts.prefix) !== "TS" || !ad.ad_number) return null;

    const tsLabel = formatProjectNumber(ts.prefix, ts.ad_number);
    const adLabel = formatProjectNumber(ad.prefix, ad.ad_number);
    const r = await appendTicketToSpaceName({
      adPrefix: normalizePrefix(ad.prefix),
      adNumber: ad.ad_number,
      tsPrefix: "TS",
      tsNumber: ts.ad_number,
      tsLabel,
    });

    if (r?.status === "renamed") {
      const msg = `チャットスペース名に ${tsLabel} を追記（${r.from} → ${r.to}）`;
      await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${ad.id}, 'chat_space_renamed', ${msg})`;
      await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${ts.id}, 'chat_space_renamed', ${`${adLabel} のスペース名に追記しました（${r.to}）`})`;
    } else if (r?.status === "no_space") {
      await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${ts.id}, 'chat_space_rename_skipped', ${`${adLabel} のチャットスペースが見つからないため、スペース名は変更していません`})`;
    }
    return r;
  } catch (e) {
    console.error("TSのスペース名追記に失敗:", e.message);
    try {
      await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${tsProjectId}, 'chat_space_rename_failed', ${`関連ADのスペース名の追記に失敗（${String(e.message).slice(0, 150)}）`})`;
    } catch {}
    return { status: "error", error: e.message };
  }
}
