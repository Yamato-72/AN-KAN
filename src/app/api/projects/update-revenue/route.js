import sql from "@/app/api/utils/sql";

// ============================================================
// 支払ナビからの「売上同期」専用窓口
//   - 支払ナビの販売案件で売上を保存した瞬間に呼ばれる
//   - AN-KANの revenue は「支払ナビの写し」。編集は支払ナビ側でのみ行う
//   - 案件は 接頭辞+番号 で特定（例 "TS-0077" → TS の 77）
//   - ステータスは変更しない（クローズは close-by-payment の役目）
// ============================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// "TS-0077" / "AD-0905" / "ad905" などを {prefix, number} に分解
function parseProjectNumber(raw) {
  if (!raw) return null;
  const m = String(raw)
    .trim()
    .match(/^([A-Za-z]+)[-\s]?0*(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[2], 10);
  if (Number.isNaN(n)) return null;
  return { prefix: m[1].toUpperCase(), number: n };
}

export async function POST(request) {
  const headers = { ...corsHeaders(), "Content-Type": "application/json" };

  try {
    const body = await request.json();
    const { project_number, revenue } = body;

    // 1) 案件番号を分解
    const parsed = parseProjectNumber(project_number);
    if (!parsed) {
      return Response.json(
        { error: "案件番号(project_number)が正しくありません", received: project_number },
        { status: 400, headers },
      );
    }

    // 2) 売上の検証（数値・0以上）
    const r = Number(revenue);
    if (revenue === undefined || revenue === null || Number.isNaN(r) || r < 0) {
      return Response.json(
        { error: "売上(revenue)が正しくありません", received: revenue },
        { status: 400, headers },
      );
    }

    // 3) 接頭辞+番号で案件を特定（prefix未設定の旧データはADとみなす）
    const found = await sql`
      SELECT id, revenue FROM projects
      WHERE COALESCE(prefix, 'AD') = ${parsed.prefix}
        AND ad_number = ${parsed.number}
    `;
    if (found.length === 0) {
      return Response.json(
        {
          error: "該当する案件が見つかりません",
          project_number: `${parsed.prefix}-${parsed.number}`,
        },
        { status: 404, headers },
      );
    }
    if (found.length > 1) {
      // 重複番号（既知の宿題）は事故防止のため更新しない
      return Response.json(
        {
          error: "同じ番号の案件が複数あるため更新をスキップしました",
          project_number: `${parsed.prefix}-${parsed.number}`,
        },
        { status: 409, headers },
      );
    }

    const project = found[0];
    const oldRevenue = project.revenue === null ? null : Number(project.revenue);

    // 4) 値が同じなら何もしない（ログも汚さない）
    if (oldRevenue !== null && oldRevenue === r) {
      return Response.json(
        { message: "変更なし", revenue: r },
        { status: 200, headers },
      );
    }

    // 5) 更新＋活動ログ
    await sql`
      UPDATE projects SET revenue = ${r}, updated_at = NOW() WHERE id = ${project.id}
    `;
    const oldLabel =
      oldRevenue === null ? "未設定" : `¥${oldRevenue.toLocaleString()}`;
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${project.id}, 'revenue_synced', ${`支払ナビから売上を同期（${oldLabel} → ¥${r.toLocaleString()}）`})
    `;

    return Response.json(
      { message: "売上を同期しました", revenue: r },
      { status: 200, headers },
    );
  } catch (error) {
    console.error("売上同期エラー:", error);
    return Response.json(
      { error: "売上の同期に失敗しました" },
      { status: 500, headers },
    );
  }
}
