export const dynamic = "force-dynamic"; // ビルド時に固定されないように（毎回シートを読む）
import { loadStock, summaryMap } from "@/app/api/utils/stockState";
import { gzipJson } from "@/app/api/utils/gzipJson";

// 案件番号 → 物の状態の数（一覧のカード用）。{ "AD-1840": { production, inspecting, inspected, waiting, shipped, total } }
export async function GET(request) {
  try {
    const { rows } = await loadStock();
    return gzipJson(request, summaryMap(rows));
  } catch (e) {
    console.error("物の状態の集計エラー:", e);
    return Response.json({}, { status: 200 });
  }
}
