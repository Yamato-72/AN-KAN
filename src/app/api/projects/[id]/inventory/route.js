import sql from "@/app/api/utils/sql";
import { normalizeProjectNumber, readDataRanges } from "@/app/api/utils/salesSheet";
import { gzipJson } from "@/app/api/utils/gzipJson";

// ============================================================
// この案件にひもづく「物」（在庫ナビの在庫シート＋アーカイブ）
//   used   … 出庫先＝この案件の物（引当済・出庫済）。発注番号が別なら「在庫から引当」
//   sentTo … 発注番号＝この案件の物が、どこへ行ったか（まとめ買い SP 用）
//   シートは2分だけ覚えておく（案件ページを開くたびに全件読まないため）
// 列: A ID, B Serial, C 種別, D 製品名, E 発注接頭辞, F 発注番号, G 発注日, H 入庫日,
//     I ステータス, J 出庫日, K 出庫接頭辞, L 出庫番号, M 取得金, N 備考, O 棚番, P 保管場所
// ============================================================
let cache = { at: 0, rows: null };
const TTL = 2 * 60 * 1000;

async function loadRows() {
  if (cache.rows && Date.now() - cache.at < TTL) return cache.rows;
  const [live, archive] = await readDataRanges(["在庫!A2:P", "在庫アーカイブ!A2:P"]);
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
  const rows = [
    ...live.filter((r) => r[0]).map((r) => toItem(r, false)),
    ...archive.filter((r) => r[0]).map((r) => toItem(r, true)),
  ];
  cache = { at: Date.now(), rows };
  return rows;
}

const IN_STOCK = ["入庫待ち", "検品待ち", "在庫中"];

export async function GET(request, { params }) {
  try {
    const [p] = await sql`SELECT prefix, ad_number FROM projects WHERE id = ${params.id}`;
    if (!p) return Response.json({ error: "案件が見つかりません" }, { status: 404 });
    const key = normalizeProjectNumber(`${p.prefix || "AD"}-${p.ad_number}`);
    if (!key) return Response.json({ key: "", used: [], sentTo: null });

    const rows = await loadRows();
    const used = rows
      .filter((r) => r.ship === key)
      .sort((a, b) => a.serial.localeCompare(b.serial, "ja", { numeric: true }))
      .map((r) => ({ ...r, fromStock: !!r.order && r.order !== key }));

    // 発注した物の行き先（自分で使った分は除き、別案件・在庫に残っている分を数える）
    //   まとめ買いは SP で発注する運用なので、行き先は SP の案件だけ出す
    const ordered = key.startsWith("SP-") ? rows.filter((r) => r.order === key) : [];
    let sentTo = null;
    if (ordered.length) {
      const dest = {};
      let inStock = 0, self = 0, other = 0;
      ordered.forEach((r) => {
        if (r.ship && r.ship === key) { self++; return; }
        if (r.ship && (r.status === "引当済" || r.status === "出庫済" || r.status === "出庫済み" || r.archived)) {
          const d = (dest[r.ship] ||= { project: r.ship, count: 0, products: {} });
          d.count++;
          d.products[r.productName] = (d.products[r.productName] || 0) + 1;
          return;
        }
        if (IN_STOCK.includes(r.status)) { inStock++; return; }
        other++; // 社内使用・不良品・廃棄など
      });
      sentTo = {
        total: ordered.length,
        self,
        inStock,
        other,
        destinations: Object.values(dest).sort((a, b) => b.count - a.count),
      };
    }

    // 番号 → AN-KANの案件ID（リンク用）
    const keys = new Set([
      ...used.map((u) => u.order),
      ...(sentTo ? sentTo.destinations.map((d) => d.project) : []),
    ].filter(Boolean));
    const links = {};
    if (keys.size) {
      const all = await sql`SELECT id, prefix, ad_number, project_name FROM projects`;
      all.forEach((x) => {
        const k = normalizeProjectNumber(`${x.prefix || "AD"}-${x.ad_number}`);
        if (keys.has(k)) links[k] = { id: x.id, name: x.project_name || "" };
      });
    }

    return gzipJson(request, { key, used, sentTo, links });
  } catch (e) {
    console.error("案件の在庫読み取りエラー:", e);
    return Response.json({ error: "在庫シートを読めませんでした" }, { status: 500 });
  }
}
