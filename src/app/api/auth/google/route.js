import { query } from "@/lib/db";
import { createSession } from "@/lib/session";
import {
  GOOGLE_CLIENT_ID,
  ALLOWED_DOMAIN,
  SESSION_COOKIE,
  SESSION_DAYS,
} from "@/lib/authConfig";

// ============================================================
// Googleログインの受付窓口
//   - ログイン画面から届いた「Googleの本人証明書(IDトークン)」を
//     Googleに問い合わせて検証し、会社ドメインなら入場スタンプを発行
//   - メールアドレスが担当者テーブルにあれば、担当コードも紐付ける
// ============================================================

export async function POST(request) {
  try {
    if (!process.env.AUTH_SECRET) {
      return Response.json(
        { error: "AUTH_SECRETが未設定です（Cloud Runの環境変数）" },
        { status: 500 },
      );
    }

    const { credential } = await request.json();
    if (!credential) {
      return Response.json({ error: "認証情報がありません" }, { status: 400 });
    }

    // Googleに証明書の真偽を確認
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    );
    if (!res.ok) {
      return Response.json({ error: "Google認証に失敗しました" }, { status: 401 });
    }
    const info = await res.json();

    // 発行先がこのアプリ宛か・メールが確認済みか・会社ドメインか
    if (info.aud !== GOOGLE_CLIENT_ID) {
      return Response.json({ error: "認証情報が不正です" }, { status: 401 });
    }
    if (info.email_verified !== "true" && info.email_verified !== true) {
      return Response.json({ error: "メール未確認のアカウントです" }, { status: 401 });
    }
    const email = (info.email || "").toLowerCase();
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return Response.json(
        { error: `会社アカウント（@${ALLOWED_DOMAIN}）でログインしてください` },
        { status: 403 },
      );
    }

    // 担当者テーブルと突き合わせ（居なくてもログイン自体は許可）
    let staff = null;
    try {
      const { rows } = await query(
        `SELECT code, name, COALESCE(is_admin, false) AS is_admin, COALESCE(all_view, false) AS all_view FROM staff_members WHERE LOWER(email) = $1 AND active = true LIMIT 1`,
        [email],
      );
      staff = rows[0] || null;
    } catch (e) {
      console.error("担当者照合エラー:", e);
    }

    // 入場スタンプを発行（30日有効）
    const payload = {
      email,
      name: staff?.name || info.name || email,
      code: staff?.code || null,
      isAdmin: staff?.is_admin === true,
      allView: staff?.all_view === true,
      exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    };
    const token = await createSession(payload, process.env.AUTH_SECRET);

    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
    );
    return new Response(JSON.stringify({ ok: true, user: payload }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("ログイン処理エラー:", error);
    return Response.json({ error: "ログイン処理に失敗しました" }, { status: 500 });
  }
}
