import sql from "@/app/api/utils/sql";

// ============================================================
// ダッシュボード（調達ナビ）向けの「集計サマリー」窓口
//   - AN-KANのDB（Neon）から、見張りに必要な数字だけを返す
//   - 公開URLから呼ばれるため、顧客名・案件名などの中身は返さない
//     （件数・案件番号・日付のみ。詳細はAN-KAN本体で見る）
//   - 対象は進行中案件のみ（失注・保留は除外）
// ============================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// 表示用の案件番号（TS/SPは4桁ゼロ埋め、ADはそのまま）
function formatNumber(prefix, num) {
  const p = prefix || "AD";
  if (p === "TS" || p === "SP") {
    return `${p}-${String(num).padStart(4, "0")}`;
  }
  return `${p}-${num}`;
}

export async function GET() {
  const headers = { ...corsHeaders(), "Content-Type": "application/json" };

  let step = "開始";
  try {
    // 1) ステータス別の件数（進行中のみ）
    step = "ステータス集計";
    const statusRows = await sql`
      SELECT status, COUNT(*)::int AS count
      FROM projects
      WHERE lost_flag = false AND hold_flag = false
      GROUP BY status
    `;
    const pipeline = {};
    statusRows.forEach((r) => {
      pipeline[r.status] = r.count;
    });

    // 2) トラブル案件の件数
    step = "トラブル集計";
    const troubleRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM projects
      WHERE trouble_flag = true
        AND lost_flag = false AND hold_flag = false
        AND status != '残金請求済'
    `;

    // 3) 納期アラート：納期が7日以内 or 超過しているのに完了していない案件
    //    （番号・納期・ステータスのみ返す）
    step = "納期アラート集計";
    const deliveryRows = await sql`
      SELECT prefix, ad_number, delivery_date, status
      FROM projects
      WHERE lost_flag = false AND hold_flag = false
        AND status != '残金請求済'
        AND delivery_date IS NOT NULL
        AND delivery_date <= (CURRENT_DATE + INTERVAL '7 days')
      ORDER BY delivery_date ASC
      LIMIT 20
    `;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryAlerts = deliveryRows.map((r) => {
      const d = new Date(r.delivery_date);
      d.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((d - today) / 86400000);
      return {
        number: formatNumber(r.prefix, r.ad_number),
        deliveryDate: r.delivery_date,
        status: r.status,
        daysLeft, // マイナス＝納期超過
      };
    });

    return Response.json(
      {
        pipeline,
        trouble: troubleRows[0]?.count ?? 0,
        deliveryAlerts,
        generatedAt: new Date().toISOString(),
      },
      { status: 200, headers },
    );
  } catch (error) {
    console.error("ダッシュボード集計エラー:", error);
    // デバッグしやすいよう、どの手順で・どんなエラーかを返す
    // （テーブルの列名レベルの情報のみで、案件データは含まれない）
    return Response.json(
      {
        error: "集計に失敗しました",
        step,
        detail: String(error && error.message ? error.message : error),
      },
      { status: 500, headers },
    );
  }
}
