import sql from "@/app/api/utils/sql";
import { findSpaceByName, postCardToSpace } from "@/app/api/utils/googleChat";
import { getSalesMap, normalizeProjectNumber, readDataRanges } from "@/app/api/utils/salesSheet";
import { getSessionFromRequest } from "@/lib/authz";
import { loadStock, summaryMap } from "@/app/api/utils/stockState";

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

// 「見張りから外す」ボタンの行き先（AN-KANのURLから作る）
function ignoreLink(id) {
  const base = process.env.ANKAN_PROJECT_URL_BASE;
  if (!base || !id) return "";
  try { return `${new URL(base).origin}/api/watch/ignore?id=${id}`; } catch { return ""; }
}

function projectLink(id) {
  const base = process.env.ANKAN_PROJECT_URL_BASE;
  return base && id ? `${base.replace(/\/$/, "")}/${id}` : "";
}

// 問題1つ = { title, count, items: [{ head, sub, url }], more }
function issue(title, items, toItem) {
  return { title, count: items.length, items: items.slice(0, MAX_LIST).map(toItem), more: Math.max(0, items.length - MAX_LIST) };
}

// Chat のカード（見出し → 問題ごとの区切り → 1件1行、AN-KANで開くボタン）
function buildCard(today, issues) {
  const sections = issues.map((it, i) => ({
    header: `${it.title}${it.count ? `（${it.count}件）` : ""}`,
    collapsible: it.items.length > 5,
    uncollapsibleWidgetsCount: 5,
    widgets: [
      ...it.items.map((x) => ({
        decoratedText: {
          topLabel: x.sub || undefined,
          text: x.head,
          wrapText: true,
          ...(x.url ? { button: { text: "開く", onClick: { openLink: { url: x.url } } } } : {}),
        },
      })),
      ...(it.items.some((x) => x.ignoreUrl)
        ? [{ textParagraph: { text: `<font color="#80868b">わざと止めている案件は、下のボタンで見張りから外せます</font>` } },
           { buttonList: { buttons: it.items.filter((x) => x.ignoreUrl).slice(0, 5).map((x) => ({
               text: `${x.label}を外す`, onClick: { openLink: { url: x.ignoreUrl } } })) } }]
        : []),
      ...(it.more ? [{ textParagraph: { text: `<font color="#80868b">ほか ${it.more}件</font>` } }] : []),
      ...(it.note ? [{ textParagraph: { text: it.note } }] : []),
    ],
  }));
  return [{
    cardId: `watch-${today}`,
    card: {
      header: { title: "連携の見張り", subtitle: `${today}　気になるところが ${issues.length}種類あります` },
      sections,
    },
  }];
}

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

  // 1. 売上入力済み × 未完了（「見張りから外す」を押した案件は除く）
  try {
    await sql`CREATE TABLE IF NOT EXISTS watch_ignore (project_id INTEGER PRIMARY KEY, created_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const map = await getSalesMap();
    const rows = await sql`
      SELECT p.id, p.prefix, p.ad_number, p.project_name, p.status, s.name AS staff
      FROM projects p LEFT JOIN staff_members s ON p.assigned_team_member = s.code
      WHERE COALESCE(p.lost_flag,false) = false AND COALESCE(p.hold_flag,false) = false
        AND p.status <> '残金請求済'
        AND p.id NOT IN (SELECT project_id FROM watch_ignore)
    `;
    const hits = rows.filter((p) => {
      const s = map[normalizeProjectNumber(`${p.prefix || "AD"}-${p.ad_number}`)];
      return s && s.amount > 0;
    });
    if (hits.length) {
      issues.push(issue("売上が入っているのに、AN-KANで未完了", hits, (p) => ({
        label: `${p.prefix || "AD"}-${p.ad_number}`,
        head: `<b>${p.prefix || "AD"}-${p.ad_number}</b>　${p.project_name || "（名前なし）"}`,
        sub: `${p.status}・${p.staff || "担当なし"}`,
        url: projectLink(p.id),
        ignoreUrl: ignoreLink(p.id),
      })));
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
      issues.push(issue("入荷予定日を過ぎても入庫待ち", late, (x) => ({
        head: `<b>${x.k}</b>　${x.n}点`,
        sub: `入荷予定 ${x.d}`,
      })));
    }
  } catch (e) {
    errors.push(`入荷予定の照合ができませんでした（${e.message}）`);
  }

  // 2b. ステータスと物の状態のずれ
  //   ・受注済みのまま14日、サプライヤーへの支払いも引当もない → 発注の依頼漏れかも
  //   ・手配中で、物が全部出荷済み → 残金の請求漏れかも
  try {
    const { rows: stock, paid } = await loadStock();
    const sum = summaryMap(stock);
    const allocated = new Set(stock.filter((r) => r.ship).map((r) => r.ship));
    const projs = await sql`
      SELECT p.id, p.prefix, p.ad_number, p.project_name, p.status, s.name AS staff,
        (SELECT MAX(a.created_at) FROM project_activities a
          WHERE a.project_id = p.id AND a.activity_type = 'status_update' AND a.description LIKE '%「受注済み」に%') AS ordered_at,
        p.updated_at
      FROM projects p LEFT JOIN staff_members s ON p.assigned_team_member = s.code
      WHERE p.status IN ('受注済み', '手配中')
        AND COALESCE(p.lost_flag,false) = false AND COALESCE(p.hold_flag,false) = false
        AND COALESCE(p.prefix,'AD') <> 'SP'
        AND p.id NOT IN (SELECT project_id FROM watch_ignore)
    `;
    const keyOf = (p) => normalizeProjectNumber(`${p.prefix || "AD"}-${p.ad_number}`);
    const days = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null);
    const toRow = (p, sub) => ({
      label: `${p.prefix || "AD"}-${p.ad_number}`,
      head: `<b>${p.prefix || "AD"}-${p.ad_number}</b>　${p.project_name || "（名前なし）"}`,
      sub: `${sub}・${p.staff || "担当なし"}`,
      url: projectLink(p.id),
      ignoreUrl: ignoreLink(p.id),
    });
    const notOrdered = projs.filter((p) => {
      if (p.status !== "受注済み") return false;
      const k = keyOf(p);
      if (paid.has(k) || allocated.has(k)) return false;
      const d = days(p.ordered_at || p.updated_at);
      return d !== null && d >= 14;
    });
    if (notOrdered.length) {
      issues.push(issue("受注済みのまま2週間、発注も引当もない", notOrdered, (p) => toRow(p, `受注から${days(p.ordered_at || p.updated_at)}日`)));
    }
    const allShipped = projs.filter((p) => {
      if (p.status !== "手配中") return false;
      const m = sum[keyOf(p)];
      return m && m.total > 0 && m.shipped === m.total;
    });
    if (allShipped.length) {
      issues.push(issue("物は全部出荷済みなのに、まだ手配中（残金の請求は？）", allShipped, (p) => toRow(p, `出荷済み ${sum[keyOf(p)].shipped}台`)));
    }
  } catch (e) {
    errors.push(`ステータスと物の状態の照合ができませんでした（${e.message}）`);
  }

  // 3. 図面・PL/CI通知のGASが動いているか（最後に呼ばれてから3時間以上空いていたら知らせる）
  try {
    await ensureHeartbeatTable();
    const hb = await sql`SELECT at FROM watch_heartbeat WHERE name = 'drawing-check'`;
    if (!hb.length) {
      issues.push({ title: "図面・PL/CI通知のGAS", count: 0, items: [], more: 0, note: "まだ一度も呼ばれた記録がありません" });
    } else {
      const hours = (Date.now() - new Date(hb[0].at).getTime()) / 3600_000;
      if (hours > 3) issues.push({ title: "図面・PL/CI通知のGAS", count: 0, items: [], more: 0, note: `${Math.floor(hours)}時間動いていません（10分おきのはずです）` });
    }
  } catch (e) {
    errors.push(`GASの動作記録を確認できませんでした（${e.message}）`);
  }

  if (errors.length) issues.push({ title: "見張りの途中で読めなかったもの", count: 0, items: [], more: 0, note: errors.join("<br>") });

  if (dry) return Response.json({ today, issues });

  let posted = false;
  if (issues.length) {
    const space = await findSpaceByName(SPACE_NAME);
    if (!space) return Response.json({ ok: false, reason: `「${SPACE_NAME}」スペースが見つかりません（AN-KANアプリを追加してください）`, count: issues.length }, { status: 200 });
    const summary = `連携の見張り ${today}：` + issues.map((it) => `${it.title}${it.count ? ` ${it.count}件` : ""}`).join("／");
    await postCardToSpace(space.name, summary, buildCard(today, issues));
    posted = true;
  }
  return Response.json({ ok: true, issues: issues.length, posted });
}
