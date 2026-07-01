import { createSign } from "crypto";

// ============================================================
// 支払ナビの「案件」シートから、発注デポジットの支払状況を読む
//   - サービスアカウント(ankan-sheets)で読み取りのみ。書き込みはしない
//   - 「案件」シートの各行は 接頭辞+番号 で案件を識別
//   - G列「デポジット予定」にJSON配列が入っており、各回の paid / paidDate を見る
//
//   「案件」シートの列（A〜）:
//     A:ID  B:接頭辞  C:番号  D:サプライヤーID  E:製品名  F:総額USD  G:デポジット予定(JSON)
// ============================================================

const DATA_SPREADSHEET_ID =
  process.env.INVENTORY_SPREADSHEET_ID ||
  "1-Sv1ci9aQ80d5U42lTa2_eWfDCpsp2HESIOpHkOaxQQ";
const PROJECT_SHEET_NAME = "案件";

async function getSheetsAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    // 読み取りだけなので readonly スコープで十分
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
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`トークン取得に失敗: ${res.status} - ${errorText}`);
  }
  const data = await res.json();
  return data.access_token;
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

function base64UrlEncode(str) {
  const buffer =
    typeof str === "string" ? Buffer.from(str, "utf8") : Buffer.from(str);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// 指定した接頭辞+番号の案件の、デポジット支払明細を返す
//   戻り値: { found: bool, deposits: [{depositNumber, percentage, amountUSD, paid, paidDate, amountJPY}], productName }
export async function getDepositStatus({ prefix, number }) {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return { found: false, error: "サービスアカウントが設定されていません" };
  }
  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch (e) {
    return { found: false, error: "サービスアカウントキーの形式が不正です" };
  }

  try {
    const accessToken = await getSheetsAccessToken(credentials);

    // 案件シートの A2:G を読む（接頭辞B・番号C・デポジット予定G）
    const range = `${PROJECT_SHEET_NAME}!A2:G`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${DATA_SPREADSHEET_ID}/values/${encodeURIComponent(range)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const errorText = await res.text();
      const hint =
        res.status === 403
          ? "（案件シートにサービスアカウントを共有してください）"
          : "";
      return { found: false, error: `案件シートの読み取りに失敗: ${res.status}${hint}` };
    }

    const data = await res.json();
    const rows = data.values || [];
    const numStr = String(number);

    // 接頭辞(列B=index1)・番号(列C=index2)が一致する行を探す
    const row = rows.find(
      (r) =>
        String(r[1] || "").toUpperCase() === String(prefix).toUpperCase() &&
        String(r[2]) === numStr,
    );

    if (!row) {
      return { found: false };
    }

    const productName = row[4] || "";
    let deposits = [];
    try {
      const parsed = JSON.parse(row[6] || "[]");
      if (Array.isArray(parsed)) {
        deposits = parsed.map((d) => ({
          depositNumber: d.depositNumber,
          percentage: d.percentage,
          amountUSD: d.amountUSD,
          paid: !!d.paid,
          paidDate: d.paidDate || null,
          amountJPY: d.amountJPY ?? null,
        }));
      }
    } catch (e) {
      // JSONが壊れている場合は空扱い
      deposits = [];
    }

    return { found: true, deposits, productName };
  } catch (error) {
    return { found: false, error: error.message };
  }
}
