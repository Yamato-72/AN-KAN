import { getCurrentFySales, currentFyStart } from "@/app/api/utils/salesSheet";

// ============================================================
// ヘッダーの「今期売上バンド」用の集計窓口（AN-KAN内部から呼ぶ）
//   - 支払ナビの「販売案件売上」シートが正。ここは読むだけ
// ============================================================

const TARGET_SALES = 270000000; // 8期目標 2.7億（期が変わったらここを更新）

export async function GET() {
  try {
    const { total, count, periodNo, marginPct } = await getCurrentFySales();

    // 経過月数（期首からの月数、当月含む）
    const now = new Date();
    const fyStart = currentFyStart(now);
    const elapsed =
      (now.getFullYear() - fyStart.getFullYear()) * 12 +
      (now.getMonth() - fyStart.getMonth()) +
      1;
    const theory = (TARGET_SALES * elapsed) / 12; // 目標ペースの理論値

    return Response.json({
      periodNo,
      total,
      marginPct, // 概算粗利率（売上ゼロならnull）
      targetMargin: 48,
      count,
      target: TARGET_SALES,
      achievedPct: (total / TARGET_SALES) * 100,
      elapsed,
      diff: total - theory,
    });
  } catch (error) {
    console.error("今期売上集計エラー:", error);
    return Response.json({ error: "集計に失敗しました" }, { status: 500 });
  }
}
