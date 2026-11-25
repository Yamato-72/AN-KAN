import { createSign } from "crypto";

// ============================================================
// 支払ナビの「案件」シートから、発注デポジットの支払状況を読む
//   - サービスアカウント(ankan-sheets)で読み取りのみ。書き込みはしない
//   - 「案件」シートの各行は 接頭辞+番号 で案件を識別
//   - G列「デポジット予定」にJSON配列が入っており、各回の paid / paidDate を見る
//
//   列は「何列目か」ではなく、1行目の見出し名で探す（支払ナビ側で列を足しても、ずれないように）
//   支払ナビは保存のたびに1行目へ見出しを書く:
//     ID / 接頭辞 / 番号 / サプライヤーID / 製品名 / 総額USD / デポジット予定 / Serial / 数量 /
//     WorkingDays / 集荷予定日 / 発注日 / 諸費用 / 入庫完了 / 通貨 / 発注ロット / 入荷予定日
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

// 見出しが見つからないときに使う、いまの列位置（0始まり）。見出しがあればそちらを優先
const FALLBACK_COLS = {
  接頭辞: 1, 番号: 2, 製品名: 4, デポジット予定: 6, 発注ロット: 15, 入荷予定日: 16,
};

// 「案件」シートを見出しごと読み、{ rows, get(row, 見出し名) } を返す
async function readProjectSheet(accessToken, spreadsheetId) {
  const range = `${PROJECT_SHEET_NAME}!A1:Z`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId || DATA_SPREADSHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const errorText = await res.text();
    const hint = res.status === 403 ? "（案件シートにサービスアカウントを共有してください）" : "";
    return { ok: false, error: `案件シートの読み取りに失敗: ${res.status}${hint} ${errorText.slice(0, 120)}` };
  }
  const values = (await res.json()).values || [];
  const header = (values[0] || []).map((h) => String(h || "").trim());
  const index = {};
  Object.keys(FALLBACK_COLS).forEach((name) => {
    const i = header.indexOf(name);
    index[name] = i >= 0 ? i : FALLBACK_COLS[name];
  });
  // 1行目が見出しでない（古いシート）ときは、1行目もデータとして扱う
  const hasHeader = header.includes("接頭辞") || header.includes("番号");
  const rows = hasHeader ? values.slice(1) : values;
  const get = (row, name) => row[index[name]];
  return { ok: true, rows, get };
}

// 行が 接頭辞+番号 の案件かどうか（旧形式：接頭辞の列に "AD-1234" が入っている行にも対応）
function matchesProject(row, get, prefix, number) {
  const b = String(get(row, "接頭辞") || "");
  const old = b.match(/^([A-Za-z]+)-0*(\d+)$/);
  const p = old ? old[1] : b.replace(/-$/, "") || "AD";
  const n = old ? parseInt(old[2], 10) : parseInt(get(row, "番号"), 10);
  return p.toUpperCase() === String(prefix).toUpperCase() && n === parseInt(number, 10);
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

    const sheet = await readProjectSheet(accessToken);
    if (!sheet.ok) return { found: false, error: sheet.error };
    const { rows, get } = sheet;

    // 接頭辞・番号が一致する行を「すべて」集める
    //   同じ案件番号に複数製品・追加発注（発注ロット）がある場合があるため
    const matched = rows.filter((r) => matchesProject(r, get, prefix, number));

    if (matched.length === 0) {
      return { found: false };
    }

    // 発注ロット × 支払回 ごとに合算
    //   初回の1回目と追加発注の1回目は別の支払いなので混ぜない
    const byKey = {};
    const productNames = [];
    matched.forEach((r) => {
      const name = get(r, "製品名");
      if (name && !productNames.includes(name)) productNames.push(name);
      const orderBatch = parseInt(get(r, "発注ロット"), 10) || 0;
      let parsed = [];
      try {
        parsed = JSON.parse(get(r, "デポジット予定") || "[]");
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

// ============================================================
// 入荷予定日（支払ナビ「案件」シートの「入荷予定日」列）を読む
//   - 和田さんが支払ナビの「グループ編集」で入れる、倉庫に届く予定の日
//   - 同じ案件番号の行が複数ある（製品・発注ロット違い）ときは、いちばん早い日を返す
//   - spreadsheetId を渡すとそのシートを読む（テスト環境用）
//   戻り値: { ok: bool, date: "YYYY-MM-DD" | "", error? }
// ============================================================
export async function getArrivalDate({ prefix, number, spreadsheetId }) {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) return { ok: false, error: "サービスアカウントが設定されていません" };
  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch (e) {
    return { ok: false, error: "サービスアカウントキーの形式が不正です" };
  }
  const accessToken = await getSheetsAccessToken(credentials);
  const sheet = await readProjectSheet(accessToken, spreadsheetId);
  if (!sheet.ok) return { ok: false, error: sheet.error };
  const { rows, get } = sheet;
  const dates = rows
    .filter((r) => matchesProject(r, get, prefix, number))
    .map((r) => {
      const m = String(get(r, "入荷予定日") || "").trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
      return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : "";
    })
    .filter(Boolean)
    .sort();
  return { ok: true, date: dates[0] || "" };
}
