import sql from "@/app/api/utils/sql";
import { getArrivalDate } from "@/app/api/utils/paymentSheet";
import { findProjectSpace, postToSpace } from "@/app/api/utils/googleChat";
import { formatProjectNumber } from "@/lib/prefixes";

// ============================================================
// 入荷予定日の変更を、案件の Google Chat スペースへ知らせる窓口
//   - 支払ナビで入荷予定日を保存した瞬間に、支払ナビから呼ばれる（POST {project_number, test}）
//   - 送られてきた日付は信用せず、AN-KAN が支払ナビの「案件」シートを読み直して確かめる
//     → 同じ番号で何度呼ばれても、日付が本当に変わったときだけ1回通知する
//   - 前回の日付は arrival_watch 表に覚えておく（本番とテストは別々に覚える）
//   - GET ?test_space=AD-999999 で、そのスペースにテスト投稿だけする（設定の確認用）
// ============================================================

const TEST_SPREADSHEET_ID = "1VwfwgSgfCN3CsO-L2kwtfqggy5sW9eMIGW8bGczxcFE"; // 【テスト】調達管理データ

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function parseProjectNumber(raw) {
  const m = String(raw || "").trim().match(/^([A-Za-z]+)[-\s]?0*(\d+)$/);
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), number: parseInt(m[2], 10) };
}

// "2026-12-05" → "12/5"（今年でなければ "2027/1/5"）
function shortDate(d) {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const md = `${parseInt(m[2], 10)}/${parseInt(m[3], 10)}`;
  return Number(m[1]) === new Date().getFullYear() ? md : `${m[1]}/${md}`;
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS arrival_watch (
      env TEXT NOT NULL DEFAULT 'prod',
      prefix TEXT NOT NULL,
      number INTEGER NOT NULL,
      arrival_date TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (env, prefix, number)
    )
  `;
}

function projectLink(id) {
  const base = process.env.ANKAN_PROJECT_URL_BASE;
  return base && id ? `${base.replace(/\/$/, "")}/${id}` : "";
}

export async function POST(request) {
  const headers = corsHeaders();
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = parseProjectNumber(body.project_number);
    if (!parsed) {
      return Response.json({ error: "案件番号(project_number)が正しくありません" }, { status: 400, headers });
    }
    const env = body.test ? "test" : "prod";
    const { prefix, number } = parsed;

    // 1) 支払ナビのシートから、今の入荷予定日を読む
    const cur = await getArrivalDate({ prefix, number, spreadsheetId: env === "test" ? TEST_SPREADSHEET_ID : undefined });
    if (!cur.ok) return Response.json({ error: cur.error }, { status: 502, headers });

    // 2) 前回覚えた日付と比べる
    await ensureTable();
    const prev = await sql`
      SELECT arrival_date FROM arrival_watch WHERE env = ${env} AND prefix = ${prefix} AND number = ${number}
    `;
    const oldDate = prev.length ? prev[0].arrival_date : "";
    if (oldDate === cur.date) {
      return Response.json({ message: "変更なし", arrival_date: cur.date }, { status: 200, headers });
    }
    await sql`
      INSERT INTO arrival_watch (env, prefix, number, arrival_date, updated_at)
      VALUES (${env}, ${prefix}, ${number}, ${cur.date}, NOW())
      ON CONFLICT (env, prefix, number) DO UPDATE SET arrival_date = EXCLUDED.arrival_date, updated_at = NOW()
    `;

    // 3) 文面を作る
    const label = formatProjectNumber(prefix, number);
    let text;
    if (!oldDate) text = `${label} の入荷予定日が ${shortDate(cur.date)} に設定されました`;
    else if (!cur.date) text = `${label} の入荷予定日が取り消されました（元の予定 ${shortDate(oldDate)}）`;
    else text = `${label} の入荷予定日が ${shortDate(oldDate)} → ${shortDate(cur.date)} に更新されました`;
    if (env === "test") text = `【テスト】${text}`;

    const proj = await sql`
      SELECT id FROM projects WHERE COALESCE(prefix, 'AD') = ${prefix} AND ad_number = ${number}
    `;
    const projectId = proj.length === 1 ? proj[0].id : null;
    const link = projectLink(projectId);
    if (link) text += `\n${link}`;

    // 4) AN-KAN の活動ログにも残す（本番のみ）
    if (projectId && env === "prod") {
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${projectId}, 'arrival_date_synced', ${text.split("\n")[0]})
      `;
    }

    // 5) 案件スペースへ投稿
    const { space, count } = await findProjectSpace(prefix, number);
    if (!space) {
      return Response.json(
        { message: "日付は更新しましたが、案件番号の入ったChatスペースが見つかりませんでした（AN-KANアプリが参加しているか確認してください）", text },
        { status: 200, headers },
      );
    }
    await postToSpace(space.name, text);
    return Response.json(
      { message: "通知しました", space: space.displayName, duplicateSpaces: count > 1 ? count : undefined, text },
      { status: 200, headers },
    );
  } catch (error) {
    console.error("入荷予定日の通知エラー:", error);
    return Response.json({ error: "入荷予定日の通知に失敗しました", detail: String(error.message || error) }, { status: 500, headers });
  }
}

// 設定確認用：GET /api/projects/arrival-check?test_space=AD-999999
export async function GET(request) {
  const headers = corsHeaders();
  try {
    const q = new URL(request.url).searchParams.get("test_space");
    const parsed = parseProjectNumber(q);
    if (!parsed) return Response.json({ error: "?test_space=AD-999999 のように案件番号を指定してください" }, { status: 400, headers });
    const { space, count } = await findProjectSpace(parsed.prefix, parsed.number);
    if (!space) return Response.json({ error: "案件番号の入ったスペースが見つかりません。スペースにAN-KANアプリを追加してください" }, { status: 404, headers });
    await postToSpace(space.name, `【テスト】AN-KANからの通知テストです（${formatProjectNumber(parsed.prefix, parsed.number)}）`);
    return Response.json({ message: "テスト投稿しました", space: space.displayName, duplicateSpaces: count > 1 ? count : undefined }, { status: 200, headers });
  } catch (error) {
    return Response.json({ error: "テスト投稿に失敗しました", detail: String(error.message || error) }, { status: 500, headers });
  }
}
