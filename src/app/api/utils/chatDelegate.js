import sql from "@/app/api/utils/sql";

// ============================================================
// 「和田さんの代わりに」Chatスペースを作るための仕組み（ユーザー代行）
//   - 管理者インストールが使えないため、許可した人のアカウントでスペースを作る
//   - 必要なもの：
//       ① OAuthクライアント（ID・シークレット）… 設定画面で和田さんが貼る
//       ② 許可（リフレッシュトークン）… 設定画面の「許可する」で一度だけ
//   - どちらもDBに暗号化して置く（鍵は Cloud Run の AUTH_SECRET）
// ============================================================

export const DELEGATE_SCOPES = [
  "https://www.googleapis.com/auth/chat.spaces.create", // スペースを作る
  "https://www.googleapis.com/auth/chat.memberships", // 人を入れる
  "https://www.googleapis.com/auth/chat.memberships.app", // AN-KANアプリを入れる
  "https://www.googleapis.com/auth/chat.spaces.readonly", // 自分が入っているスペースを見る（二重作成を防ぐ）
  "openid",
  "email",
];

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS app_secrets (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

// ---- 暗号化（AES-GCM。鍵は AUTH_SECRET から作る） ----
async function aesKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET が未設定です");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("chat-delegate:" + secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const b64 = (u8) => Buffer.from(u8).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function encrypt(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(text));
  return b64(iv) + "." + b64(new Uint8Array(ct));
}
async function decrypt(stored) {
  const [iv, ct] = stored.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await aesKey(), unb64(ct));
  return new TextDecoder().decode(pt);
}

export async function setSecret(key, value) {
  await ensureTable();
  const enc = await encrypt(value);
  await sql`
    INSERT INTO app_secrets (key, value, updated_at) VALUES (${key}, ${enc}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}
export async function getSecret(key) {
  await ensureTable();
  const rows = await sql`SELECT value FROM app_secrets WHERE key = ${key}`;
  if (!rows.length) return null;
  try {
    return await decrypt(rows[0].value);
  } catch {
    return null;
  }
}
export async function deleteSecret(key) {
  await ensureTable();
  await sql`DELETE FROM app_secrets WHERE key = ${key}`;
}

// 今の状態（画面に出す用。秘密そのものは返さない）
export async function delegateStatus() {
  await ensureTable();
  const rows = await sql`SELECT key, updated_at FROM app_secrets WHERE key IN ('chat_oauth_client_id','chat_oauth_client_secret','chat_refresh_token','chat_delegate_email')`;
  const has = Object.fromEntries(rows.map((r) => [r.key, r.updated_at]));
  return {
    clientId: (await getSecret("chat_oauth_client_id")) || null,
    hasClientSecret: !!has.chat_oauth_client_secret,
    authorized: !!has.chat_refresh_token,
    authorizedAt: has.chat_refresh_token || null,
    email: (await getSecret("chat_delegate_email")) || null,
  };
}

// リダイレクト先（このサーバー自身のURL + /api/chat/oauth/callback）
export function callbackUrl(request) {
  const h = request.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}/api/chat/oauth/callback`;
}

// 許可した人のアクセストークンを取る（無ければ null）
let tokenCache = { token: null, exp: 0 };
export async function getDelegateToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;
  const [refresh, id, secret] = await Promise.all([
    getSecret("chat_refresh_token"),
    getSecret("chat_oauth_client_id"),
    getSecret("chat_oauth_client_secret"),
  ]);
  if (!refresh || !id || !secret) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`代行の許可が使えません（${j.error || res.status}）。設定画面で許可し直してください`);
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in - 120) * 1000 };
  return j.access_token;
}
export function clearDelegateToken() {
  tokenCache = { token: null, exp: 0 };
}

// 許可した人が入っているスペースの一覧（二重作成を防ぐため。許可が無い・古いときは null）
let userSpaceCache = { list: null, exp: 0 };
export async function listDelegateSpaces() {
  if (userSpaceCache.list && userSpaceCache.exp > Date.now()) return userSpaceCache.list;
  const token = await getDelegateToken();
  if (!token) return null;
  const list = [];
  let pageToken = "";
  do {
    const url = new URL("https://chat.googleapis.com/v1/spaces");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("filter", 'spaceType = "SPACE"');
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      console.error("和田さんのスペース一覧が取れません（許可のし直しが必要かも）:", res.status);
      return null;
    }
    const data = await res.json();
    (data.spaces || []).forEach((sp) => list.push({ name: sp.name, displayName: sp.displayName || "" }));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  userSpaceCache = { list, exp: Date.now() + 5 * 60_000 };
  return list;
}
export function clearDelegateSpaces() {
  userSpaceCache = { list: null, exp: 0 };
}
