import sql from "@/app/api/utils/sql";

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { newAssignedTeamMember } = await request.json();

    // 新しい担当者のコードを取得
    const newAssignee = await sql`
      SELECT code, name FROM staff_members WHERE id = ${newAssignedTeamMember}
    `;

    if (!newAssignee.length) {
      return Response.json(
        { error: "指定された担当者が見つかりません" },
        { status: 400 },
      );
    }

    const newAssignedCode = newAssignee[0].code;

    // 現在の担当者情報を取得（ログ用）
    const currentProject = await sql`
      SELECT assigned_team_member FROM projects WHERE id = ${id}
    `;

    let oldAssigneeName = "未設定";
    if (currentProject.length && currentProject[0].assigned_team_member) {
      const oldAssignee = await sql`
        SELECT name FROM staff_members WHERE code = ${currentProject[0].assigned_team_member}
      `;
      if (oldAssignee.length) {
        oldAssigneeName = oldAssignee[0].name;
      }
    }

    // プロジェクトの担当者を変更（アルファベットコードで保存）
    const result = await sql`
      UPDATE projects 
      SET assigned_team_member = ${newAssignedCode}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!result.length) {
      return Response.json(
        { error: "プロジェクトが見つかりません" },
        { status: 404 },
      );
    }

    // アクティビティログに記録（担当者によって記録されたものとして）
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description, created_by)
      VALUES (
        ${id},
        'assignment_change',
        ${`担当者が${oldAssigneeName}から${newAssignee[0].name}に変更されました`},
        ${newAssignedTeamMember}
      )
    `;

    return Response.json({ success: true, project: result[0] });
  } catch (error) {
    console.error("プロジェクトの担当者変更エラー:", error);
    return Response.json(
      { error: "担当者の変更に失敗しました" },
      { status: 500 },
    );
  }
}



