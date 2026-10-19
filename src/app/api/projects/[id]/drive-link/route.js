import sql from "@/app/api/utils/sql";
import { requireEditPermission } from "@/lib/authz";

// ============================================================
// Driveフォルダリンクの手動設定（過去案件の既存フォルダ紐付け用）
//   PUT { drive_folder_link: "https://..." }  … 設定・変更
//   PUT { drive_folder_link: "" or null }     … リンクを外す
//   - 編集できるのは担当者・コラボレーター・管理者（門番を継承）
//   - フォルダの新規作成は一切しない。リンクを覚えるだけ
// ============================================================

export async function PUT(request, { params }) {
  try {
    // 編集権限チェック（見学モード中は素通し）
    const denied = await requireEditPermission(request, params.id);
    if (denied) return denied;

    const body = await request.json();
    let link = (body.drive_folder_link || "").trim() || null;

    // URL形式チェック（空＝リンク解除はOK）
    if (link && !/^https?:\/\//.test(link)) {
      return Response.json(
        { error: "URLは https:// から始まる形式で入力してください" },
        { status: 400 },
      );
    }

    const rows = await sql`
      UPDATE projects
      SET drive_folder_link = ${link}, updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING id, drive_folder_link
    `;
    if (rows.length === 0) {
      return Response.json({ error: "案件が見つかりません" }, { status: 404 });
    }

    // 活動ログに記録
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${params.id}, 'drive_link_updated',
        ${link ? "Driveフォルダリンクを設定しました" : "Driveフォルダリンクを解除しました"})
    `;

    return Response.json(rows[0]);
  } catch (error) {
    console.error("Driveリンク更新エラー:", error);
    return Response.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
