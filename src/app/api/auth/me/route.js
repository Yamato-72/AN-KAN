import { verifySession, readCookie } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/authConfig";

// 今ログインしている本人の情報を返す窓口
export async function GET(request) {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  const session = await verifySession(token, process.env.AUTH_SECRET);
  if (!session) {
    return Response.json({ user: null }, { status: 200 });
  }
  return Response.json({ user: session }, { status: 200 });
}
