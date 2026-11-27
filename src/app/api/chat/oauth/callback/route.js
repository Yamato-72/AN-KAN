import { verifySession } from "@/lib/session";
import { getSecret, setSecret, callbackUrl, clearDelegateToken } from "@/app/api/utils/chatDelegate";

export const dynamic = "force-dynamic";

// Google の許可画面から戻ってくる口。リフレッシュトークンを保存して設定画面へ戻す
export async function GET(request) {
  const u = new URL(request.url);
  const back = (msg) => {
    const base = callbackUrl(request).replace(/\/api\/chat\/oauth\/callback$/, "");
    return Response.redirect(`${base}/chat-setup?result=${encodeURIComponent(msg)}`, 302);
  };
  if (u.searchParams.get("error")) return back("許可されませんでした：" + u.searchParams.get("error"));
  const state = await verifySession(u.searchParams.get("state"), process.env.AUTH_SECRET);
  if (!state) return back("時間切れです。もう一度「許可する」を押してください");
  const code = u.searchParams.get("code");
  const [id, secret] = await Promise.all([getSecret("chat_oauth_client_id"), getSecret("chat_oauth_client_secret")]);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: callbackUrl(request), grant_type: "authorization_code" }),
  });
  const j = await res.json();
  if (!res.ok || !j.refresh_token) return back("許可の受け取りに失敗しました：" + (j.error_description || j.error || "refresh_token なし"));
  let email = state.email || "";
  try {
    const p = JSON.parse(Buffer.from(String(j.id_token).split(".")[1], "base64url").toString());
    if (p.email) email = p.email;
  } catch {}
  await setSecret("chat_refresh_token", j.refresh_token);
  await setSecret("chat_delegate_email", email);
  clearDelegateToken();
  return back("ok");
}
