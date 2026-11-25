import { createSign } from "crypto";

// ============================================================
// Google Chat へ「AN-KAN」アプリ（ボット）として投稿する
//   - サービスアカウント(GOOGLE_SERVICE_ACCOUNT_KEY)で chat.bot スコープのトークンを取る
//   - 投稿先は「AN-KANアプリが参加しているスペース」のうち、名前に案件番号が入っているもの
//       例: 「AD-1666 ○○様 屋外サイネージ」 → AD-1666 の通知先
//   - 前提（Google Cloud側の設定）:
//       1) サービスアカウントと同じプロジェクトで Google Chat API を有効化
//       2) Chat API の「構成」でアプリ名 AN-KAN などを登録
//       3) 各案件スペースに AN-KAN アプリを追加しておく
// ============================================================

let tokenCache = { token: "", exp: 0 };
let spaceCache = { list: null, exp: 0 };

function b64url(str) {
  const buf = typeof str === "string" ? Buffer.from(str, "utf8") : Buffer.from(str);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getChatToken() {
  if (tokenCache.token && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error("サービスアカウントが設定されていません");
  const cred = JSON.parse(key);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: cred.client_email,
      scope: "https://www.googleapis.com/auth/chat.bot",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  sign.end();
  const jwt = `${header}.${payload}.${b64url(sign.sign(cred.private_key))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`Chatのトークン取得に失敗: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  tokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

// AN-KANアプリが参加しているスペースの一覧（10分キャッシュ）
async function listSpaces() {
  if (spaceCache.list && spaceCache.exp > Date.now()) return spaceCache.list;
  const token = await getChatToken();
  const list = [];
  let pageToken = "";
  do {
    const url = new URL("https://chat.googleapis.com/v1/spaces");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Chatスペース一覧の取得に失敗: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    (data.spaces || []).forEach((s) => list.push({ name: s.name, displayName: s.displayName || "" }));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  spaceCache = { list, exp: Date.now() + 10 * 60_000 };
  return list;
}

// 案件番号（例 AD-1666 / TS-0077 / TS-77）が名前に入っているスペースを探す
//   - 番号の0埋めのあるなし、ハイフンのあるなしは同じとみなす
//   - 「AD-1666」で「AD-16660」に当たらないよう、番号の後ろが数字でないことを確認
export async function findProjectSpace(prefix, number) {
  const re = new RegExp(`(^|[^A-Za-z])${prefix}[-\\s]?0*${parseInt(number, 10)}(?!\\d)`, "i");
  let hits = (await listSpaces()).filter((s) => re.test(s.displayName));
  // 見つからないときは、スペース名の変更や新規追加を反映するため一覧を取り直す
  if (!hits.length) {
    clearSpaceCache();
    hits = (await listSpaces()).filter((s) => re.test(s.displayName));
  }
  return { space: hits[0] || null, count: hits.length };
}

export async function postToSpace(spaceName, text) {
  const token = await getChatToken();
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Chatへの投稿に失敗: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export function clearSpaceCache() {
  spaceCache = { list: null, exp: 0 };
}
