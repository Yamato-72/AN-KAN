import { getSessionFromRequest } from "@/lib/authz";
import { delegateStatus, setSecret, deleteSecret, callbackUrl, clearDelegateToken } from "@/app/api/utils/chatDelegate";

export const dynamic = "force-dynamic";

// Chatスペース代行の設定（管理者のみ）
//   GET    … 今の状態
//   POST   … { clientId, clientSecret } を保存
//   DELETE … 許可を取り消す（クライアント情報は残す）
async function admin(request) {
  const s = await getSessionFromRequest(request);
  if (!s) return { error: Response.json({ error: "ログインが必要です" }, { status: 401 }) };
  if (!s.isAdmin) return { error: Response.json({ error: "管理者だけが設定できます" }, { status: 403 }) };
  return { session: s };
}

export async function GET(request) {
  const a = await admin(request);
  if (a.error) return a.error;
  return Response.json({ ...(await delegateStatus()), redirectUri: callbackUrl(request) });
}

export async function POST(request) {
  const a = await admin(request);
  if (a.error) return a.error;
  const { clientId, clientSecret } = await request.json();
  if (!/\.apps\.googleusercontent\.com$/.test(String(clientId || "").trim()))
    return Response.json({ error: "クライアントIDの形が違います（…apps.googleusercontent.com で終わるもの）" }, { status: 400 });
  if (!String(clientSecret || "").trim()) return Response.json({ error: "シークレットが空です" }, { status: 400 });
  await setSecret("chat_oauth_client_id", clientId.trim());
  await setSecret("chat_oauth_client_secret", clientSecret.trim());
  clearDelegateToken();
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const a = await admin(request);
  if (a.error) return a.error;
  await deleteSecret("chat_refresh_token");
  await deleteSecret("chat_delegate_email");
  clearDelegateToken();
  return Response.json({ ok: true });
}
