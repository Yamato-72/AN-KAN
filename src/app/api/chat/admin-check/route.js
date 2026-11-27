import { getSessionFromRequest } from "@/lib/authz";
import { previewTicketRename } from "@/app/api/utils/googleChat";

// 管理者権限（ドメイン全体の委任）が効いているかの確認用。スペース名は変えない
//   例: /api/chat/admin-check?ad=AD-362&ts=TS-0120
export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const u = new URL(request.url);
  const m = String(u.searchParams.get("ad") || "").toUpperCase().match(/^([A-Z]+)-?0*(\d+)$/);
  if (!m) return Response.json({ error: "?ad=AD-362 のように指定してください" }, { status: 400 });
  try {
    const hits = await previewTicketRename({ adPrefix: m[1], adNumber: m[2], tsLabel: u.searchParams.get("ts") || null });
    return Response.json({ ok: true, hits });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
