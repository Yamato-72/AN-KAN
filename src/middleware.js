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
  "/api/projects/arrival-check", // 支払ナビ→入荷予定日の変更をChatへ通知
  "/api/projects/drawing-check", // GAS→案件フォルダに入った図面をChatへ通知
  "/api/chat/events", // Google Chat「AN-KAN」アプリの受け口
  "/api/dashboard/external-summary", // YSダッシュボード→集計
  "/api/health", // 動作確認（どの版が動いているか）
  "/api/watch", // GAS→連携の見張り（問題があるときだけ見張りスペースへ）
  "/favicon",
  "/_next/",
];

// 2026-11-28 サーバーをシンガポールへ移した。古いヨーロッパのURLに来た人は新しいURLへ送る
const OLD_HOST = "an-kan-47228502594.europe-west1.run.app";
const NEW_ORIGIN = "https://an-kan-47228502594.asia-southeast1.run.app";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (host === OLD_HOST && pathname !== "/api/health") {
    return NextResponse.redirect(NEW_ORIGIN + pathname + request.nextUrl.search, 308);
  }

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
