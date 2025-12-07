import sql from "@/app/api/utils/sql";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { trouble_flag } = await request.json();

    if (trouble_flag) {
      // トラブルフラグを設定する場合：元の担当者を保存して古川（E）に変更
      const [updatedProject] = await sql`
        UPDATE projects 
        SET trouble_flag = ${trouble_flag}, 
            original_assigned_team_member = assigned_team_member,
            assigned_team_member = 'E',
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (!updatedProject) {
        return Response.json(
          { error: "プロジェクトが見つかりません" },
          { status: 404 },
        );
      }

      // アクティビティログを追加
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description, created_at)
        VALUES (${id}, 'trouble_flag', 'トラブルフラグを設定し、担当者を古川さんに変更しました', NOW())
      `;

      return Response.json({
        success: true,
        message: "トラブルフラグを設定し、担当者を古川さんに変更しました",
        project: updatedProject,
      });
    } else {
      // トラブルフラグを解除する場合：元の担当者に戻す
      const [updatedProject] = await sql`
        UPDATE projects 
        SET trouble_flag = ${trouble_flag}, 
            assigned_team_member = COALESCE(original_assigned_team_member, assigned_team_member),
            original_assigned_team_member = NULL,
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (!updatedProject) {
        return Response.json(
          { error: "プロジェクトが見つかりません" },
          { status: 404 },
        );
      }

      // アクティビティログを追加
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description, created_at)
        VALUES (${id}, 'trouble_flag', 'トラブルフラグを解除し、担当者を元に戻しました', NOW())
      `;

      return Response.json({
        success: true,
        message: "トラブルフラグを解除し、担当者を元に戻しました",
        project: updatedProject,
      });
    }
  } catch (error) {
    console.error("Error updating trouble flag:", error);
    return Response.json(
      { error: "トラブルフラグの更新に失敗しました" },
      { status: 500 },
    );
  }
}



