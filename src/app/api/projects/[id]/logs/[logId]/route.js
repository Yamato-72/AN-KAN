import sql from "@/app/api/utils/sql";

// ログの更新
export async function PUT(request, { params }) {
  try {
    const { id, logId } = params;
    const body = await request.json();
    const { title, content, log_date } = body;

    if (!title || !content) {
      return Response.json(
        { error: "タイトルと内容は必須です" },
        { status: 400 },
      );
    }

    const result = await sql`
      UPDATE project_logs 
      SET title = ${title}, content = ${content}, log_date = ${log_date}, updated_at = NOW()
      WHERE id = ${logId} AND project_id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return Response.json({ error: "ログが見つかりません" }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error("Error updating project log:", error);
    return Response.json(
      { error: "ログの更新に失敗しました" },
      { status: 500 },
    );
  }
}

// ログの削除
export async function DELETE(request, { params }) {
  try {
    const { id, logId } = params;

    const result = await sql`
      DELETE FROM project_logs 
      WHERE id = ${logId} AND project_id = ${id}
      RETURNING title
    `;

    if (result.length === 0) {
      return Response.json({ error: "ログが見つかりません" }, { status: 404 });
    }

    // プロジェクトのアクティビティログにも記録
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${id}, 'log_deleted', ${`ログ「${result[0].title}」を削除しました`})
    `;

    return Response.json({ message: "ログを削除しました" });
  } catch (error) {
    console.error("Error deleting project log:", error);
    return Response.json(
      { error: "ログの削除に失敗しました" },
      { status: 500 },
    );
  }
}



