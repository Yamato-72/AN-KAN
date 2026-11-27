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

const tokenCache = {}; // スコープごとに覚える
let spaceCache = { list: null, exp: 0 };

function b64url(str) {
  const buf = typeof str === "string" ? Buffer.from(str, "utf8") : Buffer.from(str);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// サービスアカウントのトークン（Chat用・Drive読み取り用など、スコープごとに1時間使い回す）
export async function getServiceToken(scope) {
  const c = tokenCache[scope];
  if (c && c.exp > Date.now() + 60_000) return c.token;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error("サービスアカウントが設定されていません");
  const cred = JSON.parse(key);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: cred.client_email,
      scope,
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
  if (!res.ok) throw new Error(`トークン取得に失敗: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  tokenCache[scope] = { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
  return data.access_token;
}

function getChatToken() {
  return getServiceToken("https://www.googleapis.com/auth/chat.bot");
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

// ============================================================
// 案件のスペースを自動で作る（受注済みになったとき）
//   - スペース名：「AD-1877/プロジェクト名」
//   - AN-KANアプリ自身がメンバーになるので、作った直後から通知が届く
//   - 必要な権限：chat.app.spaces.create / chat.app.memberships（Workspace管理者の一度だけの承認）
//   - 承認前や失敗しても、ステータス更新は止めない（呼び出し側で握りつぶす）
// ============================================================
const SPACE_SCOPES =
  "https://www.googleapis.com/auth/chat.app.spaces.create https://www.googleapis.com/auth/chat.app.memberships";

// 毎回入れるメンバー（Cloud Run の CHAT_SPACE_MEMBERS で上書きできる。カンマ区切り）
const DEFAULT_MEMBERS = [
  "toshihiro.wada8010@yamato-signage.com",
  "erina.yoshioka8010@yamato-signage.com",
  "operation8010@yamato-signage.com",
  "shoji.ohyama8010@yamato-signage.com",
  "miki.sakashita8010@yamato-signage.com",
  "management-team8010@yamato-signage.com",
];
function spaceMembers() {
  const env = (process.env.CHAT_SPACE_MEMBERS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return env.length ? env : DEFAULT_MEMBERS;
}

export async function createProjectSpace({ label, projectName, driveLink }) {
  const token = await getServiceToken(SPACE_SCOPES);
  // 名前は128文字まで
  const displayName = `${label}/${projectName || ""}`.slice(0, 128);
  const res = await fetch("https://chat.googleapis.com/v1/spaces", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      spaceType: "SPACE",
      displayName,
      customer: "customers/my_customer",
      spaceDetails: driveLink ? { description: `Driveフォルダ：${driveLink}`.slice(0, 150) } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`スペースの作成に失敗: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const space = await res.json();

  // メンバーを1人ずつ追加（失敗した人は記録して、あとでスペースに書く）
  const failed = [];
  for (const email of spaceMembers()) {
    const r = await fetch(`https://chat.googleapis.com/v1/${space.name}/members`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ member: { name: `users/${email}`, type: "HUMAN" } }),
    });
    if (!r.ok) failed.push(`${email}（${r.status}）`);
  }
  clearSpaceCache();
  return { space, displayName, failed };
}

// 受注済みになった案件に、スペースがまだ無ければ作る（あれば何もしない）
export async function ensureProjectSpace(project) {
  const prefix = project.prefix || "AD";
  const { space } = await findProjectSpace(prefix, project.ad_number);
  if (space) return { created: false, space };
  const label = `${prefix}-${String(project.ad_number)}`;
  const { space: made, displayName, failed } = await createProjectSpace({
    label,
    projectName: project.project_name,
    driveLink: project.drive_folder_link || (project.drive_folder_id ? `https://drive.google.com/drive/folders/${project.drive_folder_id}` : ""),
  });
  const lines = [
    `「${displayName}」のスペースを、受注にあわせてAN-KANが作りました。`,
    "入荷予定日の変更・図面・PL/CIなどの知らせは、ここに届きます。",
  ];
  if (failed.length) lines.push(`※ 次のメンバーは自動で追加できませんでした。手で追加してください：${failed.join("、")}`);
  try { await postToSpace(made.name, lines.join("\n")); } catch (e) { console.error(e); }
  return { created: true, space: made, failed };
}

// 名前がぴったり同じスペースを探す（「システム見張り」など）
export async function findSpaceByName(displayName) {
  let hit = (await listSpaces()).find((s) => s.displayName === displayName);
  if (!hit) {
    clearSpaceCache();
    hit = (await listSpaces()).find((s) => s.displayName === displayName);
  }
  return hit || null;
}
