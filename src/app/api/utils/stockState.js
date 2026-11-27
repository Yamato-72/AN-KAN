import { normalizeProjectNumber, readDataRanges } from "@/app/api/utils/salesSheet";

// ============================================================
// 在庫ナビ・支払ナビのシートから「案件ごとの物の状態」を作る
//   - 在庫／在庫アーカイブ：1台ずつ（サービスチケットは除く）
//   - 案件（支払ナビの発注）：デポジットを1回でも払った発注番号 → paid
//   - 2分だけ覚えておく（一覧・案件ページ・10分おきの自動処理で共有）
// 列: A ID, B Serial, C 種別, D 製品名, E 発注接頭辞, F 発注番号, G 発注日, H 入庫日,
//     I ステータス, J 出庫日, K 出庫接頭辞, L 出庫番号, M 取得金, N 備考, O 棚番, P 保管場所
// ============================================================
let cache = { at: 0, value: null };
const TTL = 2 * 60 * 1000;

const isTicket = (r) => r[2] === "サービス" || /^SVC-/i.test(r[1] || "");
const toItem = (r, archived) => ({
  id: r[0] || "",
  serial: r[1] || "",
  category: r[2] || "",
  productName: r[3] || "",
  order: normalizeProjectNumber(`${r[4] || ""}-${r[5] || ""}`),
  status: r[8] || "",
  shipDate: r[9] || "",
  ship: normalizeProjectNumber(`${r[10] || ""}-${r[11] || ""}`),
  cost: parseFloat(String(r[12] || "").replace(/,/g, "")) || 0,
  location: r[15] || "",
  archived,
});

export async function loadStock() {
  if (cache.value && Date.now() - cache.at < TTL) return cache.value;
  const [live, archive, orders] = await readDataRanges(["在庫!A2:P", "在庫アーカイブ!A2:P", "案件!A2:G"]);
  const rows = [
    ...live.filter((r) => r[0] && !isTicket(r)).map((r) => toItem(r, false)),
    ...archive.filter((r) => r[0] && !isTicket(r)).map((r) => toItem(r, true)),
  ];
  // サプライヤーへ1回でも払った発注番号
  const paid = new Set();
  orders.forEach((r) => {
    const p1 = String(r[1] || "");
    const key = normalizeProjectNumber(/^[A-Z]+-\d+$/i.test(p1) ? p1 : `${(p1 || "AD").replace(/-$/, "")}-${r[2] || ""}`);
    if (!key) return;
    try {
      const deps = JSON.parse(r[6] || "[]");
      if (Array.isArray(deps) && deps.some((d) => d && d.paid)) paid.add(key);
    } catch {}
  });
  cache = { at: Date.now(), value: { rows, paid } };
  return cache.value;
}

// 1台が、ある案件から見て今どの段にいるか
//   出庫先がこの案件 → 出荷待ち（引当済）／出荷済み
//   この案件で発注して、まだどこにも引き当てていない → 生産・輸送中（入庫待ち）／検品待ち／検品済み（在庫中）
const EMPTY = () => ({ production: 0, inspecting: 0, inspected: 0, waiting: 0, shipped: 0 });
function stageOf(it, key) {
  if (it.ship === key) {
    if (it.archived || it.status === "出庫済" || it.status === "出庫済み") return "shipped";
    if (it.status === "引当済") return "waiting";
    return null;
  }
  if (it.order === key && !it.ship) {
    if (it.status === "入庫待ち") return "production";
    if (it.status === "検品待ち") return "inspecting";
    if (it.status === "在庫中") return "inspected";
  }
  return null;
}

export function summaryMap(rows) {
  const map = {};
  const add = (key, it) => {
    const st = stageOf(it, key);
    if (!st) return;
    (map[key] ||= EMPTY())[st]++;
  };
  rows.forEach((it) => {
    if (it.ship) add(it.ship, it);
    if (it.order && it.order !== it.ship) add(it.order, it);
  });
  Object.values(map).forEach((m) => { m.total = m.production + m.inspecting + m.inspected + m.waiting + m.shipped; });
  return map;
}
