import sql from "@/app/api/utils/sql";
import { findSpaceByName, postToSpace } from "@/app/api/utils/googleChat";
import { getSalesMap, normalizeProjectNumber, readDataRanges } from "@/app/api/utils/salesSheet";
import { getSessionFromRequest } from "@/lib/authz";

// ============================================================
// 連携の見張り（平日の朝にGASが呼ぶ）
//   ずれや止まりを調べて、問題があるときだけ「システム見張り」スペースに1通送る
//   ?dry=1 … 送らずに結果だけ返す（確認用・ログインした人だけ）
//
//   調べること
//   1. 売上が入っている（支払ナビ）のに、AN-KANで「残金請求済」になっていない案件
//   2. 入荷予定日を過ぎても、まだ「入庫待ち」の注文
//   3. 図面・PL/CI通知のGASが、最近AN-KANを呼んでいるか（drawing_seen の更新ではなく呼び出し記録で見る）
// ============================================================
const SPACE_NAME = "システム見張り";
const MAX_LIST = 10;

function ymdJST(d = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
}
function toYmd(v) {
  const m = String(v || "").trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : "";
}

async function ensureHeartbeatTable() {
  await sql`CREATE TABLE IF NOT EXISTS watch_heartbeat (name TEXT PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
}

export async function GET(request) {
  return run(request);
}
export async function POST(request) {
  return run(request);
}

async function run(request) {
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  if (dry) {
    // 確認用の一覧はログインした人だけ（案件名が出るため）
    const session = await getSessionFromRequest(request);
    if (!session) return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const issues = [];
  const errors = [];
  const today = ymdJST();

  // 1. 売上入力済み × 未完了
  try {
    const map = await getSalesMap();
    const rows = await sql`
      SELECT p.prefix, p.ad_number, p.project_name, p.status, s.name AS staff
      FROM projects p LEFT JOIN staff_members s ON p.assigned_team_member = s.code
      WHERE COALESCE(p.lost_flag,false) = false AND COALESCE(p.hold_flag,false) = false
        AND p.status <> '残金請求済'
    `;
    const hits = rows.filter((p) => {
      const s = map[normalizeProjectNumber(`${p.prefix || "AD"}-${p.ad_number}`)];
      return s && s.amount > 0;
    });
    if (hits.length) {
      issues.push(
        `■ 売上が入っているのに、AN-KANで未完了の案件：${hits.length}件\n` +
          hits.slice(0, MAX_LIST).map((p) => `・${p.prefix || "AD"}-${p.ad_number} ${p.project_name || ""}（${p.status}・${p.staff || "担当なし"}）`).join("\n") +
          (hits.length > MAX_LIST ? `\n…ほか${hits.length - MAX_LIST}件` : "")
      );
    }
  } catch (e) {
    errors.push(`売上とステータスの照合ができませんでした（${e.message}）`);
  }

  // 2. 入荷予定日を過ぎた入庫待ち
  try {
    const [invRows, projRows] = await readDataRanges(["在庫!A2:Q", "案件!A2:Q"]);
    const arrival = {};
    projRows.forEach((r) => {
      const p1 = String(r[1] || "");
      const key = normalizeProjectNumber(/^[A-Z]+-\d+$/i.test(p1) ? p1 : `${(p1 || "AD").replace(/-$/, "")}-${r[2] || ""}`);
      const d = toYmd(r[16]);
      if (key && d && (!arrival[key] || d < arrival[key])) arrival[key] = d;
    });
    const waiting = {};
    invRows.forEach((r) => {
      if (!String(r[1] || "").trim()) return;
      if (String(r[8] || "入庫待ち") !== "入庫待ち") return;
      const o = r[5] !== "" && r[5] !== undefined ? `${r[4] || ""}-${r[5]}` : String(r[4] || "");
      const key = normalizeProjectNumber(o);
      if (key) waiting[key] = (waiting[key] || 0) + 1;
    });
    const late = Object.keys(waiting)
      .filter((k) => arrival[k] && arrival[k] < today)
      .map((k) => ({ k, d: arrival[k], n: waiting[k] }))
      .sort((a, b) => a.d.localeCompare(b.d));
    if (late.length) {
      issues.push(
        `■ 入荷予定日を過ぎても入庫待ちの注文：${late.length}件\n` +
          late.slice(0, MAX_LIST).map((x) => `・${x.k}（予定 ${x.d}・${x.n}点）`).join("\n") +
          (late.length > MAX_LIST ? `\n…ほか${late.length - MAX_LIST}件` : "")
      );
    }
  } catch (e) {
    errors.push(`入荷予定の照合ができませんでした（${e.message}）`);
  }

  // 3. 図面・PL/CI通知のGASが動いているか（最後に呼ばれてから3時間以上空いていたら知らせる）
  try {
    await ensureHeartbeatTable();
    const hb = await sql`SELECT at FROM watch_heartbeat WHERE name = 'drawing-check'`;
    if (!hb.length) {
      issues.push("■ 図面・PL/CI通知のGASから、まだ一度も呼ばれた記録がありません");
    } else {
      const hours = (Date.now() - new Date(hb[0].at).getTime()) / 3600_000;
      if (hours > 3) issues.push(`■ 図面・PL/CI通知のGASが、${Math.floor(hours)}時間動いていません（10分おきのはず）`);
    }
  } catch (e) {
    errors.push(`GASの動作記録を確認できませんでした（${e.message}）`);
  }

  if (errors.length) issues.push("■ 見張りの途中で読めなかったもの\n" + errors.map((x) => `・${x}`).join("\n"));

  if (dry) return Response.json({ today, issues });

  let posted = false;
  if (issues.length) {
    const space = await findSpaceByName(SPACE_NAME);
    if (!space) return Response.json({ ok: false, reason: `「${SPACE_NAME}」スペースが見つかりません（AN-KANアプリを追加してください）`, count: issues.length }, { status: 200 });
    await postToSpace(space.name, `【連携の見張り ${today}】\n\n${issues.join("\n\n")}`);
    posted = true;
  }
  return Response.json({ ok: true, issues: issues.length, posted });
}
