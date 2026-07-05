import { verifySession, readCookie } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/authConfig";
import { query } from "@/lib/db";

// ============================================================
// 編集権限の門番（案B）
//   - 閲覧は全員OK。編集は「自分の担当案件」か「管理者」のみ
//   - AUTH_ENFORCE が "true" のときだけ効く（見学モードでは素通し）
//   - 使い方：mutation系APIの冒頭で
//       const denied = await requireEditPermission(request, params.id);
//       if (denied) return denied;
// ============================================================

export async function getSessionFromRequest(request) {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  return await verifySession(token, process.env.AUTH_SECRET);
}

export async function requireEditPermission(request, projectId) {
  // 見学モード中は何もしない（従来通り）
  if (process.env.AUTH_ENFORCE !== "true") return null;

  const session = await getSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (session.isAdmin) return null; // 管理者は全件OK

  try {
    const { rows } = await query(
      `SELECT assigned_team_member FROM projects WHERE id = $1`,
      [projectId],
    );
    if (rows.length === 0) return null; // 404処理は本来のハンドラに任せる
    if (rows[0].assigned_team_member === session.code) return null; // 担当本人
  } catch (e) {
    console.error("権限チェックエラー:", e);
    return Response.json({ error: "権限の確認に失敗しました" }, { status: 500 });
  }

  return Response.json(
    { error: "この案件を編集できるのは担当者または管理者のみです" },
    { status: 403 },
  );
}
