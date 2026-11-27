import sql from "@/app/api/utils/sql";
import { normalizeProjectNumber, readDataRanges } from "@/app/api/utils/salesSheet";
import { loadStock } from "@/app/api/utils/stockState";

// ============================================================
// 受注済み → 手配中 を自動で進める（10分おきの確認のついでに呼ぶ）
//   きっかけ：サプライヤーへ1回でも支払った（支払ナビ）／在庫からこの案件に引き当てた（在庫ナビ）
//   失注・保留の案件は動かさない。理由はアクティビティに残す
// ============================================================
export async function autoAdvanceToArranging({ dry = false } = {}) {
  const { rows, paid } = await loadStock();
  const allocated = new Set(rows.filter((r) => r.ship).map((r) => r.ship));
  const cands = await sql`
    SELECT id, prefix, ad_number, project_name FROM projects
    WHERE status = '受注済み' AND COALESCE(lost_flag,false) = false AND COALESCE(hold_flag,false) = false
  `;
  const moved = [];
  for (const p of cands) {
    const key = normalizeProjectNumber(`${p.prefix || "AD"}-${p.ad_number}`);
    if (!key || /^SP-/.test(key)) continue;
    const why = paid.has(key) ? "サプライヤーへの支払いがあったので" : allocated.has(key) ? "在庫から引き当てがあったので" : null;
    if (!why) continue;
    moved.push({ id: p.id, key, why });
    if (dry) continue;
    await sql`UPDATE projects SET status = '手配中', updated_at = NOW() WHERE id = ${p.id} AND status = '受注済み'`;
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${p.id}, 'status_update', ${`ステータスが「受注済み」から「手配中」に変更されました（${why}自動で）`})
    `;
  }
  return moved;
}

// ============================================================
// SP（在庫の発注）のステータスを自動で進める（2026-11-27）
//   - SPにリード・打合せ・受注はない → 手配中へ寄せる
//   - そのSPで発注した物が全部、入庫・検品を終えたら → 検品完了（中身は「残金請求済」）
//     （物が1つも登録されていないSPは動かさない）
// ============================================================
export async function autoAdvanceSp({ dry = false } = {}) {
  const { rows } = await loadStock();
  const byOrder = {};
  rows.forEach((it) => {
    if (!/^SP-/.test(it.order)) return;
    (byOrder[it.order] ||= []).push(it);
  });
  const cands = await sql`
    SELECT id, prefix, ad_number, status FROM projects
    WHERE prefix = 'SP' AND status <> '残金請求済'
      AND COALESCE(lost_flag,false) = false AND COALESCE(hold_flag,false) = false
  `;
  const moved = [];
  for (const p of cands) {
    const key = normalizeProjectNumber(`SP-${p.ad_number}`);
    const items = byOrder[key] || [];
    const pending = items.filter((it) => !it.archived && !it.ship && (it.status === "入庫待ち" || it.status === "検品待ち"));
    let to = null;
    let why = "";
    if (items.length && !pending.length) {
      to = "残金請求済";
      why = `発注した${items.length}点が全部検品済みになったので自動で検品完了に`;
    } else if (p.status !== "手配中") {
      to = "手配中";
      why = "SPにはリード・打合せ・受注がないので自動で手配中に";
    }
    if (!to) continue;
    moved.push({ id: p.id, key, from: p.status, to });
    if (dry) continue;
    await sql`UPDATE projects SET status = ${to}, updated_at = NOW() WHERE id = ${p.id} AND status = ${p.status}`;
    const label = to === "残金請求済" ? "検品完了" : to;
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${p.id}, 'status_update', ${`ステータスが「${p.status}」から「${label}」に変更されました（${why}）`})
    `;
  }
  return moved;
}

// ============================================================
// 支払ナビで付いた製品番号（YS番号）を、AN-KANの「製品番号」欄に返す（2026-11-27）
//   - 支払ナビの案件シート H列（Serial：YS0554 / YS0518(1-5) など）を、案件番号ごとに集める
//   - AN-KANの欄が空なら入れる。手で書いた内容があれば消さずに、足りない番号だけ後ろに足す
// ============================================================
export async function syncProductNumbers({ dry = false } = {}) {
  const [orders] = await readDataRanges(["案件!A2:H"]);
  const byKey = {};
  orders.forEach((r) => {
    const p1 = String(r[1] || "");
    const key = normalizeProjectNumber(/^[A-Z]+-\d+$/i.test(p1) ? p1 : `${(p1 || "AD").replace(/-$/, "")}-${r[2] || ""}`);
    const serial = String(r[7] || "").trim();
    if (!key || !serial || serial === "[]") return;
    (byKey[key] ||= []).push(serial);
  });
  const projects = await sql`SELECT id, prefix, ad_number, product_number FROM projects WHERE ad_number IS NOT NULL`;
  const changed = [];
  for (const p of projects) {
    const key = normalizeProjectNumber(`${p.prefix || "AD"}-${p.ad_number}`);
    const serials = [...new Set(byKey[key] || [])];
    if (!serials.length) continue;
    const cur = String(p.product_number || "").trim();
    const missing = serials.filter((s) => !cur.includes(s));
    if (!missing.length) continue;
    const next = cur ? `${cur}、${missing.join("、")}` : missing.join("、");
    changed.push({ id: p.id, key, from: cur, to: next });
    if (dry) continue;
    await sql`UPDATE projects SET product_number = ${next}, updated_at = NOW() WHERE id = ${p.id}`;
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${p.id}, 'product_number_synced', ${`支払ナビで付いた製品番号を入れました：${missing.join("、")}`})
    `;
  }
  return changed;
}
