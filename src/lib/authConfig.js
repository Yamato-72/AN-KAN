// ============================================================
// ログインまわりの共通設定
// ============================================================

// GoogleログインのクライアントID（支払ナビ等と同じもの。公開情報なのでコードに書いてOK）
export const GOOGLE_CLIENT_ID =
  "47228502594-hk66ecflb2s5iq02rim3o8j0j87d2p3c.apps.googleusercontent.com";

// この会社ドメインのアカウントだけログイン可能
export const ALLOWED_DOMAIN = "yamato-signage.com";

// 入場スタンプ（セッションクッキー）の名前と有効期間
export const SESSION_COOKIE = "ankan_session";
export const SESSION_DAYS = 30;
