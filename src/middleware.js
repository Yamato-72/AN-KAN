import { NextResponse } from "next/server";
import { verifySession, readCookie } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/authConfig";

// ============================================================
// 入口の門番（全ページ・全APIの前に動く）
//   - AUTH_ENFORCE が "true" のときだけ本稼働。それ以外は素通し（見学モード）
//   - 外部連携の窓口とログイン関連は常に素通し
// ============================================================

// 門番がチェックしない道（外部連携・ログイン・静的ファイル）
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/",
  "/api/projects/close-by-payment", // 支払ナビ→クローズ連携
  "/api/projects/update-revenue", // 支払ナビ→売上同期
  "/api/dashboard/external-summary", // YSダッシュボード→集計
  "/favicon",
  "/_next/",
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 素通し対象か？
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 見学モード（本稼働前）は全部素通し
  if (process.env.AUTH_ENFORCE !== "true") {
    return NextResponse.next();
  }

  // 入場スタンプを確認
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  const session = await verifySession(token, process.env.AUTH_SECRET);

  if (session) return NextResponse.next();

  // スタンプ無し：APIなら401、ページならログイン画面へ
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "ログインが必要です" },
      { status: 401 },
    );
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
