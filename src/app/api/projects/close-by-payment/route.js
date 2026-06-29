import sql from "@/app/api/utils/sql";

// ============================================================
// 支払いナビ（YS支払ナビ）からの「売上入力 → クローズ」専用窓口
//   - 既存の status 窓口は触らず、ここだけで完結させる
//   - 案件番号(ad_number)で案件を探し、まっすぐ「残金請求済」にする
//   - 売上・納品日も一緒に保存し、アクティビティログに記録する
// ============================================================

// クローズ時に立てる最終ステータス（= 完了）
const CLOSED_STATUS = "残金請求済";

// CORS: 支払いナビ（別サイト）のブラウザから叩けるように許可を返す。
// ログイン情報は送らない呼び出しなので "*" で問題ない。
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// ブラウザが本番リクエストの前に投げてくる事前確認(プリフライト)に応える
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// 案件番号を整数に正規化する
//   "AD-0001" → 1 / "0001" → 1 / 1 → 1
function normalizeAdNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw);
  const match = str.match(/(\d+)\s*$/); // 末尾の数字のかたまりを拾う
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isNaN(n) ? null : n;
}

export async function POST(request) {
  const headers = { ...corsHeaders(), "Content-Type": "application/json" };

  try {
    const body = await request.json();
    const { ad_number, revenue, deliveryDate } = body;

    // 1) 案件番号を整数に直す
    const adNum = normalizeAdNumber(ad_number);
    if (adNum === null) {
      return Response.json(
        { error: "案件番号(ad_number)が正しくありません", received: ad_number },
        { status: 400, headers },
      );
    }

    // 2) 売上の検証（任意。入っていれば数値であること）
    let revenueValue = null;
    if (revenue !== undefined && revenue !== null && revenue !== "") {
      const r = Number(revenue);
      if (Number.isNaN(r) || r < 0) {
        return Response.json(
          { error: "売上(revenue)が正しくありません", received: revenue },
          { status: 400, headers },
        );
      }
      revenueValue = r;
    }

    const deliveryValue =
      deliveryDate !== undefined && deliveryDate !== null && deliveryDate !== ""
        ? deliveryDate
        : null;

    // 3) 案件を探す
    const found = await sql`
      SELECT id, ad_number, status
      FROM projects
      WHERE ad_number = ${adNum}
    `;

    if (found.length === 0) {
      return Response.json(
        { error: "該当する案件が見つかりません", ad_number: adNum },
        { status: 404, headers },
      );
    }
    if (found.length > 1) {
      // 同じ番号が複数あるのは想定外。安全のため止める。
      return Response.json(
        {
          error: "同じ案件番号が複数あります。確認が必要です",
          ad_number: adNum,
          count: found.length,
        },
        { status: 409, headers },
      );
    }

    const project = found[0];
    const previousStatus = project.status;

    // 4) まっすぐ「残金請求済」にして、売上・納品日も保存
    const updated = await sql`
      UPDATE projects
      SET status = ${CLOSED_STATUS},
          revenue = COALESCE(${revenueValue}, revenue),
          delivery_date = COALESCE(${deliveryValue}, delivery_date),
          updated_at = NOW()
      WHERE id = ${project.id}
      RETURNING *
    `;

    // 5) アクティビティログに記録（どこから閉じたか分かるように）
    let desc = `支払いナビから売上入力によりクローズ（「${previousStatus}」→「${CLOSED_STATUS}」）`;
    if (revenueValue !== null) {
      const formatted = new Intl.NumberFormat("ja-JP").format(revenueValue);
      desc += `（売上高: ${formatted}円）`;
    }
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${project.id}, 'status_update', ${desc})
    `;

    return Response.json(
      {
        message: "クローズしました",
        ad_number: adNum,
        previousStatus,
        project: updated[0],
      },
      { status: 200, headers },
    );
  } catch (error) {
    console.error("close-by-payment エラー:", error);
    return Response.json(
      { error: "クローズ処理に失敗しました" },
      { status: 500, headers },
    );
  }
}
