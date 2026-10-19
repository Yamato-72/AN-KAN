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

    // 案件シートの A2:O を読む（接頭辞B・番号C・製品名E・デポジット予定G・発注ロットO）
    const range = `${PROJECT_SHEET_NAME}!A2:O`;
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
    const targetNum = parseInt(number, 10);

    // 接頭辞(列B)・番号(列C)が一致する行を「すべて」集める
    //   同じ案件番号に複数製品・追加発注（発注ロット）がある場合があるため
    //   番号は "0055" と 55 のような表記ゆれに備えて数値で比較
    const matched = rows.filter(
      (r) =>
        String(r[1] || "").toUpperCase() === String(prefix).toUpperCase() &&
        parseInt(r[2], 10) === targetNum,
    );

    if (matched.length === 0) {
      return { found: false };
    }

    // 発注ロット(列O) × 支払回 ごとに合算
    //   初回の1回目と追加発注の1回目は別の支払いなので混ぜない
    const byKey = {};
    const productNames = [];
    matched.forEach((r) => {
      if (r[4] && !productNames.includes(r[4])) productNames.push(r[4]);
      const orderBatch = parseInt(r[14], 10) || 0;
      let parsed = [];
      try {
        parsed = JSON.parse(r[6] || "[]");
      } catch (e) {
        parsed = []; // JSONが壊れている行はスキップ
      }
      if (!Array.isArray(parsed)) return;
      parsed.forEach((d) => {
        const key = `${orderBatch}-${d.depositNumber}`;
        if (!byKey[key]) {
          byKey[key] = {
            orderBatch,
            depositNumber: d.depositNumber,
            percentage: d.percentage,
            amountUSD: 0,
            amountJPY: null,
            paid: true, // 同じ回の全製品が支払済みのときだけ「済」
            paidDate: null,
          };
        }
        const agg = byKey[key];
        agg.amountUSD += Number(d.amountUSD) || 0;
        if (d.amountJPY !== null && d.amountJPY !== undefined && d.amountJPY !== "") {
          agg.amountJPY = (agg.amountJPY || 0) + (Number(d.amountJPY) || 0);
        }
        if (!d.paid) agg.paid = false;
        if (d.paidDate && !agg.paidDate) agg.paidDate = d.paidDate;
      });
    });

    const deposits = Object.values(byKey)
      .map((d) => ({
        ...d,
        amountUSD: Math.round(d.amountUSD * 100) / 100,
        amountJPY: d.amountJPY !== null ? Math.round(d.amountJPY) : null,
        paidDate: d.paid ? d.paidDate : null,
      }))
      .sort((x, y) => x.orderBatch - y.orderBatch || x.depositNumber - y.depositNumber);

    const productName = productNames.join(", ");

    return { found: true, deposits, productName };
  } catch (error) {
    return { found: false, error: error.message };
  }
}
