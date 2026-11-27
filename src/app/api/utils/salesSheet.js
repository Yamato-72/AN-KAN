import { createSign } from "crypto";

// ============================================================
// 「販売案件売上」シートから今期売上を集計する部品
//   - サービスアカウント(ankan-sheets)で読み取りのみ
//   - 期の判定：7月始まり（1期=2019年7月〜）
//   - 日付は 納品日(E列) を優先、無ければ 更新日(C列)
// ============================================================

const DATA_SPREADSHEET_ID =
  process.env.INVENTORY_SPREADSHEET_ID ||
  "1-Sv1ci9aQ80d5U42lTa2_eWfDCpsp2HESIOpHkOaxQQ";
const SALES_SHEET_RANGE = "販売案件売上!A2:E";
const INVENTORY_RANGE = "在庫!A2:Q";
const INVENTORY_ARCHIVE_RANGE = "在庫アーカイブ!A2:Q";
const EXPENSE_RANGE = "販売案件経費!A2:G";
const EXPENSE_COEF = 1.18; // 輸入諸掛係数（ダッシュボードと同一）
const FY_BASE_YEAR = 2019; // 1期の開始年

function base64UrlEncode(str) {
  const buffer =
    typeof str === "string" ? Buffer.from(str, "utf8") : Buffer.from(str);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function createJWT(payload, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signatureInput);
  sign.end();
  const signature = sign.sign(privateKey);
  return `${signatureInput}.${base64UrlEncode(signature)}`;
}

async function getAccessToken(credentials, write = false) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: write ? "https://www.googleapis.com/auth/spreadsheets" : "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const token = createJWT(payload, credentials.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token,
    }),
  });
  if (!res.ok) throw new Error(`トークン取得に失敗: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// 今期の開始日（7月1日）
export function currentFyStart(now = new Date()) {
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(y, 6, 1);
}

// 今期売上の合計と件数を返す
export async function getCurrentFySales() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) throw new Error("サービスアカウントが設定されていません");
  const credentials = JSON.parse(serviceAccountKey);
  const accessToken = await getAccessToken(credentials);

  const getRange = async (range) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${DATA_SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`シート読み取りに失敗(${range}): ${res.status}`);
    const data = await res.json();
    return data.values || [];
  };

  // アーカイブはシートが無い可能性もあるので失敗しても続行
  const [salesRows, invRows, expRows] = await Promise.all([
    getRange(SALES_SHEET_RANGE),
    getRange(INVENTORY_RANGE),
    getRange(EXPENSE_RANGE),
  ]);
  let archRows = [];
  try { archRows = await getRange(INVENTORY_ARCHIVE_RANGE); } catch { archRows = []; }

  const fyStart = currentFyStart();
  const fyEnd = new Date(fyStart);
  fyEnd.setFullYear(fyEnd.getFullYear() + 1);

  // 今期の売上行（ダッシュボードと同一ルール：金額>0・納品日E優先→更新日C）
  const fySales = [];
  salesRows.forEach((r) => {
    const amount = parseFloat(r[1]) || 0;
    if (amount <= 0) return;
    const dateStr = r[4] || r[2];
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d) || d < fyStart || d >= fyEnd) return;
    fySales.push({ number: r[0] || "", amount });
  });
  const total = fySales.reduce((a, s) => a + s.amount, 0);

  // 案件番号ごとの原価（在庫＋アーカイブの取得金M列、出庫先K/Lで紐付け）
  const pad4 = (n) => String(n).padStart(4, "0");
  const costMap = {};
  [...invRows, ...archRows].forEach((r) => {
    const shipPrefix = r[10] || "";
    const shipNumber = r[11] || "";
    if (!shipPrefix || !shipNumber) return;
    const key = `${String(shipPrefix).toUpperCase()}-${pad4(shipNumber)}`;
    costMap[key] = (costMap[key] || 0) + (parseInt(r[12]) || 0);
  });
  // 案件番号ごとの経費（販売案件経費のD列）
  const expMap = {};
  expRows.forEach((r) => {
    const num = r[0] || "";
    if (num) expMap[num] = (expMap[num] || 0) + (parseFloat(r[3]) || 0);
  });

  let cost = 0;
  let expense = 0;
  fySales.forEach((s) => {
    cost += costMap[s.number] || 0;
    expense += expMap[s.number] || 0;
  });
  const marginPct =
    total > 0 ? ((total - cost * EXPENSE_COEF - expense) / total) * 100 : null;

  const periodNo = fyStart.getFullYear() - FY_BASE_YEAR + 1;
  return {
    total,
    count: fySales.length,
    marginPct,
    periodNo,
    fyStart: fyStart.toISOString(),
  };
}

// ============================================================
// 案件ごとの売上（支払ナビ「販売案件売上」シートが正）
//   - AN-KANは売上の写しを持たず、表示のたびにここを引く（写しがずれないように）
//   - 戻り値：{ "AD-1739": { amount, deliveryDate } , ... }（番号は 0埋めなし・大文字にそろえる）
//   - 5分だけ覚えておく（全員の画面から何度も呼ばれるため）
// ============================================================
export function normalizeProjectNumber(raw) {
  const m = String(raw || "").trim().toUpperCase().replace(/\s/g, "").match(/^([A-Z]+)-?0*(\d+)$/);
  return m ? `${m[1]}-${parseInt(m[2], 10)}` : "";
}

let salesMapCache = { at: 0, value: null };
const SALES_MAP_TTL = 5 * 60 * 1000;

export async function getSalesMap() {
  if (salesMapCache.value && Date.now() - salesMapCache.at < SALES_MAP_TTL) return salesMapCache.value;
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) throw new Error("サービスアカウントが設定されていません");
  const accessToken = await getAccessToken(JSON.parse(serviceAccountKey));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${DATA_SPREADSHEET_ID}/values/${encodeURIComponent("販売案件売上!A2:J")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`販売案件売上の読み取りに失敗: ${res.status}`);
  const rows = (await res.json()).values || [];
  const map = {};
  rows.forEach((r) => {
    const key = normalizeProjectNumber(r[0]);
    if (!key) return;
    const amount = parseFloat(String(r[1] || "").replace(/,/g, "")) || 0;
    const dateStr = r[4] || r[2] || ""; // 納品日（E）優先 → 更新日（C）。ダッシュボードと同じ
    map[key] = {
      amount,
      deliveryDate: dateStr,
      // 保証（AD）F〜H・修理の区分（TS）I〜J。支払ナビと同じ列
      warrantyType: r[5] || "",
      warrantyFee: parseFloat(String(r[6] || "").replace(/,/g, "")) || 0,
      warrantyEnd: r[7] || "",
      tsKind: r[8] || "",
      relatedAd: r[9] || "",
    };
  });
  salesMapCache = { at: Date.now(), value: map };
  return map;
}

// 案件の一覧に、シートの売上を重ねる（シートに無い案件は、過去期の取り込み値のまま）
//   revenue        … 表示に使う売上
//   revenue_source … "sheet"（支払ナビ）/ "import"（過去の取り込み値）/ null
//   sales_date     … 売上の日付（納品日）。期の判定に使う
export async function overlaySales(projects) {
  let map = null;
  try {
    map = await getSalesMap();
  } catch (e) {
    console.error("売上シートを読めませんでした（取り込み値のまま表示）:", e.message);
  }
  return projects.map((p) => {
    const key = normalizeProjectNumber(`${p.prefix || "AD"}-${p.ad_number}`);
    const s = map && map[key];
    const extra = s ? { ts_kind: s.tsKind || null, warranty_type: s.warrantyType || null, warranty_fee: s.warrantyFee || 0, warranty_end: s.warrantyEnd || null } : {};
    if (s && s.amount > 0) return { ...p, ...extra, revenue: s.amount, revenue_source: "sheet", sales_date: s.deliveryDate || null };
    if (s) {
      const has = Number(p.revenue) > 0;
      return { ...p, ...extra, revenue_source: has ? "import" : null, sales_date: null };
    }
    const has = Number(p.revenue) > 0;
    return { ...p, revenue_source: has ? "import" : null, sales_date: null };
  });
}

// 調達管理データ（支払ナビ・在庫ナビのシート）の範囲をまとめて読む（見張り用）
export async function readDataRanges(ranges) {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) throw new Error("サービスアカウントが設定されていません");
  const accessToken = await getAccessToken(JSON.parse(serviceAccountKey));
  const qs = ranges.map((r) => "ranges=" + encodeURIComponent(r)).join("&");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${DATA_SPREADSHEET_ID}/values:batchGet?${qs}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`シートの読み取りに失敗: ${res.status}`);
  return ((await res.json()).valueRanges || []).map((v) => v.values || []);
}

// ============================================================
// TS（修理）の区分と関連ADを「販売案件売上」シートの I・J 列に書く（支払ナビと同じ場所）
//   - 行が無ければ作る（売上は空のまま）。A〜H には触らない
// ============================================================
export const TS_KINDS = ["スポット", "製品保証", "延長保証", "保証外の無償対応", "サービス保証"];

export async function writeTsInfo({ tsLabel, kind, relatedAd }) {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) throw new Error("サービスアカウントが設定されていません");
  const token = await getAccessToken(JSON.parse(serviceAccountKey), true);
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${DATA_SPREADSHEET_ID}/values`;
  const res = await fetch(`${base}/${encodeURIComponent("販売案件売上!A2:A")}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`販売案件売上の読み取りに失敗: ${res.status}`);
  const rows = (await res.json()).values || [];
  const want = normalizeProjectNumber(tsLabel);
  const idx = rows.findIndex((r) => normalizeProjectNumber(r[0]) === want);
  const ad = relatedAd || "";
  let r2;
  if (idx >= 0) {
    const row = idx + 2;
    // kind が null/undefined のときは区分はそのまま、関連ADだけ書く
    const keep = kind === null || kind === undefined;
    const range = keep ? `販売案件売上!J${row}` : `販売案件売上!I${row}:J${row}`;
    r2 = await fetch(`${base}/${encodeURIComponent(range)}?valueInputOption=RAW`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [keep ? [ad] : [kind || "", ad]] }),
    });
  } else {
    const today = new Date().toISOString().split("T")[0];
    r2 = await fetch(`${base}/${encodeURIComponent("販売案件売上!A:J")}:append?valueInputOption=RAW`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[tsLabel, "", today, "", "", "", "", "", kind || "", ad]] }),
    });
  }
  if (!r2.ok) throw new Error(`販売案件売上への書き込みに失敗: ${r2.status} ${(await r2.text()).slice(0, 150)}`);
  salesMapCache = { at: 0, value: null };
  return true;
}

// ============================================================
// 支払ナビへ「これから発注する番号」を渡す（2026-11-27）
//   - シート「発注待ち」：A 案件番号 / B 接頭辞 / C 番号 / D 名前 / E 追加日 / F きっかけ
//   - 支払ナビは、まだ発注（案件シート）が無い番号だけを「これから発注」として上に出す
//   - 支払ナビは案件シートを丸ごと書き直すので、そこには直接書かない
// ============================================================
export async function addPendingOrder({ prefix, number, name, reason }) {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) throw new Error("サービスアカウントが設定されていません");
  const token = await getAccessToken(JSON.parse(serviceAccountKey), true);
  const ss = `https://sheets.googleapis.com/v4/spreadsheets/${DATA_SPREADSHEET_ID}`;
  const SHEET = "発注待ち";
  const label = `${prefix}-${number}`;

  let res = await fetch(`${ss}/values/${encodeURIComponent(`${SHEET}!A2:A`)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 400) {
    // シートが無ければ作る（見出しつき）
    const mk = await fetch(`${ss}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: SHEET } } }] }),
    });
    if (!mk.ok) throw new Error(`発注待ちシートを作れません: ${mk.status}`);
    await fetch(`${ss}/values/${encodeURIComponent(`${SHEET}!A1:F1`)}?valueInputOption=RAW`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [["案件番号", "接頭辞", "番号", "名前", "追加日", "きっかけ"]] }),
    });
    res = await fetch(`${ss}/values/${encodeURIComponent(`${SHEET}!A2:A`)}`, { headers: { Authorization: `Bearer ${token}` } });
  }
  if (!res.ok) throw new Error(`発注待ちシートの読み取りに失敗: ${res.status}`);
  const rows = (await res.json()).values || [];
  const want = normalizeProjectNumber(label);
  if (rows.some((r) => normalizeProjectNumber(r[0]) === want)) return { added: false };

  const today = new Date(Date.now() + 9 * 3600e3).toISOString().split("T")[0];
  const ap = await fetch(`${ss}/values/${encodeURIComponent(`${SHEET}!A:F`)}:append?valueInputOption=RAW`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [[label, prefix, String(number), name || "", today, reason || ""]] }),
  });
  if (!ap.ok) throw new Error(`発注待ちシートへの書き込みに失敗: ${ap.status} ${(await ap.text()).slice(0, 150)}`);
  return { added: true };
}
