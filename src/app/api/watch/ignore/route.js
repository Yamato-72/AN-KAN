import sql from "@/app/api/utils/sql";
import { getSessionFromRequest } from "@/lib/authz";

// ============================================================
// 見張りから外す／戻す（見張りのカードの「見張りから外す」ボタンから開く）
//   GET ?id=案件ID           … 外す
//   GET ?id=案件ID&undo=1    … 戻す
//   和田・梶原のみ（WATCH_ADMINS）。結果は小さなページで返す
//   （/api/watch は門番の対象外なので、ここで自分でログインを確かめる）
// ============================================================
function page(title, body) {
  return new Response(
    `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;font-family:"Zen Kaku Gothic New",system-ui,sans-serif;background:#f6f5f1;color:#161616;display:grid;place-items:center;min-height:100vh}
.c{background:#fff;border-radius:16px;padding:28px 32px;max-width:420px;box-shadow:0 10px 30px -12px rgba(0,0,0,.25)}
h1{font-size:18px;margin:0 0 10px}p{font-size:14px;line-height:1.7;margin:0 0 16px;color:#3f3d39}
a{display:inline-block;padding:9px 16px;border-radius:10px;background:#161616;color:#fff;text-decoration:none;font-weight:700;font-size:14px}</style></head>
<body><div class="c"><h1>${title}</h1>${body}</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// 外す・戻すを押せる人（和田・梶原のみ）。Cloud Run の WATCH_ADMINS（カンマ区切りのメール）で上書きできる
const DEFAULT_ALLOWED = ["toshihiro.wada8010@yamato-signage.com", "management-team8010@yamato-signage.com"]; // 和田・梶原
function allowedEmails() {
  const env = (process.env.WATCH_ADMINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return env.length ? env : DEFAULT_ALLOWED;
}

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return page("ログインしてください", `<p>AN-KANにログインしてから、もう一度ボタンを押してください。</p><a href="/login">ログインへ</a>`);
  }
  if (!allowedEmails().includes(String(session.email || "").toLowerCase())) {
    return page("この操作はできません", "<p>見張りから外せるのは、和田さんと梶原さんだけです。</p>");
  }
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get("id"), 10);
  const undo = url.searchParams.get("undo") === "1";
  if (!id) return page("案件が分かりません", "<p>ボタンのリンクが正しくありません。</p>");

  await sql`CREATE TABLE IF NOT EXISTS watch_ignore (project_id INTEGER PRIMARY KEY, created_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  const rows = await sql`SELECT id, prefix, ad_number, project_name FROM projects WHERE id = ${id}`;
  if (!rows.length) return page("案件が見つかりません", "<p>削除された案件かもしれません。</p>");
  const p = rows[0];
  const label = `${p.prefix || "AD"}-${p.ad_number}`;
  const who = session.name || session.email || "";

  if (undo) {
    await sql`DELETE FROM watch_ignore WHERE project_id = ${id}`;
    await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${id}, 'watch_ignore', ${`連携の見張りの対象に戻しました（${who}）`})`;
    return page(`${label} を見張りに戻しました`, `<p>${p.project_name || ""}<br>次の朝の見張りから、また調べます。</p>`);
  }
  await sql`INSERT INTO watch_ignore (project_id, created_by) VALUES (${id}, ${who}) ON CONFLICT (project_id) DO NOTHING`;
  await sql`INSERT INTO project_activities (project_id, activity_type, description) VALUES (${id}, 'watch_ignore', ${`連携の見張りから外しました（${who}）`})`;
  return page(
    `${label} を見張りから外しました`,
    `<p>${p.project_name || ""}<br>この案件は、売上とステータスのずれがあっても知らせません。</p><a href="?id=${id}&undo=1">元に戻す</a>`
  );
}
