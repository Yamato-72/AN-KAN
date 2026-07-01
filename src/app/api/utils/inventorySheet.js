import { createSign } from "crypto";

// ============================================================
// 在庫スプレッドシートへの書き込みユーティリティ
//   - ANKANのサービスアカウント（GOOGLE_SERVICE_ACCOUNT_KEY）で無人書き込み
//   - 人間のGoogleログインは不要。サーバが署名付きJWTでトークンを取得して書く
//   - 前提: このサービスアカウント(client_email)を、在庫スプレッドシートに
//           「編集者」として共有しておくこと（最初の1回だけ）
//
//   在庫シートの列順（service.html と同一・A〜Q）:
//     ID, Serial, 種別, 製品名, 発注接頭辞, 発注番号, 発注日, 入庫日,
//     ステータス, 出庫日, 出庫接頭辞, 出庫番号, 取得金, 備考, 棚番, 保管場所, サプライヤーID
// ============================================================

const INVENTORY_SPREADSHEET_ID =
  process.env.INVENTORY_SPREADSHEET_ID ||
  "1-Sv1ci9aQ80d5U42lTa2_eWfDCpsp2HESIOpHkOaxQQ";
const INVENTORY_SHEET_NAME = "在庫";

// --- JWT を作ってアクセストークンを取得（Sheets用スコープ）---
async function getSheetsAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
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

// --- 既に同じTS番号でサービス発券済みかを確認（二重発券防止）---
//   在庫シートの K列(出庫接頭辞)・L列(出庫番号) を見て、同じ prefix+number があるか
async function isAlreadyIssued(accessToken, prefix, number) {
  const range = `${INVENTORY_SHEET_NAME}!K2:L`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${INVENTORY_SPREADSHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return false; // 確認に失敗しても発券自体は止めない
  const data = await res.json();
  const rows = data.values || [];
  const numStr = String(number);
  return rows.some(
    (r) =>
      (r[0] || "").toUpperCase() === prefix.toUpperCase() &&
      String(r[1]) === numStr,
  );
}

// --- サービス案件を在庫シートに1行 追記する ---
//   prefix/number: TS-74 なら prefix="TS", number=74
//   content: 製品名に入れる内容（例: 修理 / 現調 / 保守 / 案件名）
//   note:    備考
export async function issueServiceToInventory({ prefix, number, content, note }) {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return { success: false, error: "サービスアカウントが設定されていません" };
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch (e) {
    return { success: false, error: "サービスアカウントキーの形式が不正です" };
  }

  try {
    const accessToken = await getSheetsAccessToken(credentials);

    // 番号は4桁ゼロ埋め（service.html と同じ体裁）
    const numberPadded = String(number).padStart(4, "0");

    // 二重発券チェック
    const dup = await isAlreadyIssued(accessToken, prefix, numberPadded);
    if (dup) {
      return {
        success: false,
        alreadyIssued: true,
        error: `${prefix}-${numberPadded} はすでに在庫ナビへ発券済みです`,
      };
    }

    const today = new Date().toISOString().split("T")[0];
    const serial = `SVC-${prefix}${numberPadded}`;

    // 在庫シートの列順（A〜Q）に合わせた1行
    const row = [
      Date.now().toString() + "-svc", // ID
      serial, // Serial
      "サービス", // 種別
      content || "サービス", // 製品名
      prefix, // 発注接頭辞（案件番号として付与）
      numberPadded, // 発注番号
      "", // 発注日
      "", // 入庫日
      "出庫済", // ステータス
      today, // 出庫日
      prefix, // 出庫接頭辞（引き当て＝販売案件）
      numberPadded, // 出庫番号
      0, // 取得金(税別)
      note || "", // 備考
      "", // 棚番
      "", // 保管場所
      "", // サプライヤーID
    ];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${INVENTORY_SPREADSHEET_ID}/values/${encodeURIComponent(
        `${INVENTORY_SHEET_NAME}!A:Q`,
      )}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [row] }),
      },
    );

    if (!appendRes.ok) {
      const errorText = await appendRes.text();
      // 403 は「サービスアカウントが在庫シートに共有されていない」可能性が高い
      const hint =
        appendRes.status === 403
          ? "（在庫シートにサービスアカウントを編集者として共有してください）"
          : "";
      return {
        success: false,
        error: `在庫シートへの書き込みに失敗: ${appendRes.status}${hint}`,
      };
    }

    return {
      success: true,
      serial,
      projectNumber: `${prefix}-${numberPadded}`,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
