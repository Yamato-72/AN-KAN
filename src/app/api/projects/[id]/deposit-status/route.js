import sql from "@/app/api/utils/sql";
import { getDepositStatus } from "@/app/api/utils/paymentSheet";

// ============================================================
// 案件の「発注デポジット支払状況」を返す窓口
//   - 支払ナビの「案件」シートを読んで、この案件の支払明細を返す（読み取りのみ）
//   - 支払ログタブから呼ばれる
// ============================================================

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const found = await sql`
      SELECT prefix, ad_number FROM projects WHERE id = ${id}
    `;
    if (found.length === 0) {
      return Response.json({ error: "案件が見つかりません" }, { status: 404 });
    }
    const project = found[0];
    const prefix = project.prefix || "AD";

    if (!project.ad_number) {
      return Response.json({ found: false, deposits: [] });
    }

    const result = await getDepositStatus({
      prefix,
      number: project.ad_number,
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: 502 });
    }

    return Response.json({
      found: result.found,
      deposits: result.deposits || [],
      productName: result.productName || "",
    });
  } catch (error) {
    console.error("deposit-status エラー:", error);
    return Response.json(
      { error: "支払状況の取得に失敗しました" },
      { status: 500 },
    );
  }
}
