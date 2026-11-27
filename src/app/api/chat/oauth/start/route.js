import { getSessionFromRequest } from "@/lib/authz";
import { createSession } from "@/lib/session";
import { getSecret, callbackUrl, DELEGATE_SCOPES } from "@/app/api/utils/chatDelegate";

export const dynamic = "force-dynamic";

// 「許可する」を押したら Google の許可画面へ送る
export async function GET(request) {
  const s = await getSessionFromRequest(request);
  if (!s?.isAdmin) return Response.json({ error: "管理者だけが許可できます" }, { status: 403 });
  const clientId = await getSecret("chat_oauth_client_id");
  if (!clientId) return Response.json({ error: "先にクライアントIDを保存してください" }, { status: 400 });
  const state = await createSession({ email: s.email, exp: Date.now() + 10 * 60 * 1000 }, process.env.AUTH_SECRET);
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: DELEGATE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: s.email || "",
    state,
  }).toString();
  return Response.redirect(u.toString(), 302);
}
