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

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
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
