import { SESSION_COOKIE } from "@/lib/authConfig";

// ログアウト（入場スタンプを消す）
export async function POST() {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
