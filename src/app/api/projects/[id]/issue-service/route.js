import sql from "@/app/api/utils/sql";
import { requireEditPermission } from "@/lib/authz";
import { issueServiceToInventory } from "@/app/api/utils/inventorySheet";

// ============================================================
// TS案件を在庫ナビ（在庫シート）へ「サービス発券」する窓口
//   - 詳細ページの「在庫ナビへ発券」ボタンから呼ばれる
//   - 対象案件のprefix/ad_numberを使い、在庫シートにサービス行を1本立てる
//   - サーバのサービスアカウントで書くので、人間のログインは不要
// ============================================================

export async function POST(request, { params }) {
  try {
    // 編集権限チェック（担当者本人 or 管理者のみ。見学モード中は素通し）
    const denied = await requireEditPermission(request, params.id);
    if (denied) return denied;

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const content = body.content; // 内容（修理/現調/保守 など）
    const note = body.note; // 備考

    // 対象案件を取得
    const found = await sql`
      SELECT id, prefix, ad_number, project_name FROM projects WHERE id = ${id}
    `;
    if (found.length === 0) {
      return Response.json({ error: "案件が見つかりません" }, { status: 404 });
    }
    const project = found[0];
    const prefix = project.prefix || "AD";

    // TS以外は発券対象外（サービス発券はTSのみ）
    if (prefix !== "TS") {
      return Response.json(
        { error: "サービス発券はTS案件のみ可能です", prefix },
        { status: 400 },
      );
    }
    if (!project.ad_number) {
      return Response.json(
        { error: "案件番号が未設定です" },
        { status: 400 },
      );
    }

    // 内容が空なら案件名で代用
    const contentValue = content && content.trim() ? content.trim() : project.project_name;

    // 在庫シートへ書き込み
    const result = await issueServiceToInventory({
      prefix,
      number: project.ad_number,
      content: contentValue,
      note: note || "",
    });

    if (!result.success) {
      // 二重発券は409、それ以外は502（外部書き込み失敗）
      const status = result.alreadyIssued ? 409 : 502;
      return Response.json({ error: result.error }, { status });
    }

    // アクティビティログに記録
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${id}, 'service_issued', ${`在庫ナビへサービス発券（${result.projectNumber}・${contentValue}）`})
    `;

    return Response.json({
      message: "在庫ナビへ発券しました",
      serial: result.serial,
      projectNumber: result.projectNumber,
    });
  } catch (error) {
    console.error("サービス発券エラー:", error);
    return Response.json(
      { error: "サービス発券に失敗しました" },
      { status: 500 },
    );
  }
}
