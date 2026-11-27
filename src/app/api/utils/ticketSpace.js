import sql from "@/app/api/utils/sql";
import { appendTicketToSpaceName, findProjectSpace, postToSpace } from "@/app/api/utils/googleChat";
import { formatProjectNumber, normalizePrefix } from "@/lib/prefixes";

// ============================================================
// TS 案件に関連AD が付いたら、AD のスペース名に TS 番号を足し、両方の案件にログを残す
//   - 失敗しても案件の登録・更新は止めない（呼び出し側は await してもエラーにならない）
// ============================================================
export async function linkTicketToAdSpace(tsProjectId, relatedProjectId) {
  try {
    if (!relatedProjectId) return null;
    const [ts] = await sql`SELECT id, prefix, ad_number, project_name FROM projects WHERE id = ${tsProjectId}`;
    const [ad] = await sql`SELECT id, prefix, ad_number FROM projects WHERE id = ${relatedProjectId}`;
    if (!ts || !ad || normalizePrefix(ts.prefix) !== "TS" || !ad.ad_number) return null;

    const tsLabel = formatProjectNumber(ts.prefix, ts.ad_number);
    const adLabel = formatProjectNumber(ad.prefix, ad.ad_number);

    // いまは名前を変えず、ADのスペースへ投稿する（AN-KANアプリが入っているスペースだけ）
    //   スペース名の追記は特権管理者の委任が要るので、CHAT_TS_RENAME=true のときだけ
    if (process.env.CHAT_TS_RENAME !== "true") {
      return await postTicketToAdSpace({ ts, ad, tsLabel, adLabel });
    }
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
      await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${tsProjectId}, 'chat_space_rename_failed', ${`関連ADのチャット通知に失敗（${String(e.message).slice(0, 150)}）`})`;
    } catch {}
    return { status: "error", error: e.message };
  }
}

async function postTicketToAdSpace({ ts, ad, tsLabel, adLabel }) {
  const { space } = await findProjectSpace(normalizePrefix(ad.prefix), ad.ad_number);
  if (!space) {
    await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${ts.id}, 'chat_ticket_post_skipped', ${`${adLabel} のチャットスペース（AN-KANが入っているもの）が見つからないため、通知していません`})`;
    return { status: "no_space" };
  }
  const base = process.env.ANKAN_PROJECT_URL_BASE;
  const link = base ? `\n${base.replace(/\/$/, "")}/${ts.id}` : "";
  await postToSpace(space.name, `🔧 ${tsLabel} を登録しました（${ts.project_name || "修理"}）${link}`);
  await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${ad.id}, 'ticket_linked', ${`修理 ${tsLabel}（${ts.project_name || ""}）が紐づきました。チャットに通知`})`;
  await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${ts.id}, 'chat_ticket_posted', ${`${adLabel} のチャットスペースに通知しました（${space.displayName}）`})`;
  return { status: "posted", space: space.displayName };
}
