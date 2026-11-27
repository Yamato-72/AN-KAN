import sql from "@/app/api/utils/sql";
import { getSessionFromRequest } from "@/lib/authz";
import { findProjectSpace, ensureProjectSpace } from "@/app/api/utils/googleChat";

export const dynamic = "force-dynamic";

// 案件スペースの確認用
//   /api/chat/space-check?ad=AD-1877          … スペースがあるか見るだけ（何も作らない）
//   /api/chat/space-check?ad=AD-1877&create=1 … 無ければ作る（受注済みのときと同じ動き）。失敗理由をそのまま返す
export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const u = new URL(request.url);
  const m = String(u.searchParams.get("ad") || "").toUpperCase().match(/^([A-Z]+)-?0*(\d+)$/);
  if (!m) return Response.json({ error: "?ad=AD-1877 のように指定してください" }, { status: 400 });
  try {
    if (u.searchParams.get("create") === "1") {
      const rows = await sql`SELECT * FROM projects WHERE prefix = ${m[1]} AND ad_number = ${parseInt(m[2], 10)} LIMIT 1`;
      if (!rows.length) return Response.json({ ok: false, error: "案件が見つかりません" }, { status: 404 });
      const r = await ensureProjectSpace(rows[0]);
      if (r.created) {
        await sql`
          INSERT INTO project_activities (project_id, activity_type, description)
          VALUES (${rows[0].id}, 'chat_space_created', ${"Chatスペースを自動で作りました" + (r.failed?.length ? `（追加できなかったメンバー：${r.failed.join("、")}）` : "")})
        `;
      }
      return Response.json({ ok: true, created: r.created, space: r.space?.displayName, failed: r.failed || [] });
    }
    const { space, count } = await findProjectSpace(m[1], m[2]);
    return Response.json({ ok: true, found: !!space, count, space: space?.displayName || null });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
