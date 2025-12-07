import sql from "@/app/api/utils/sql";

// ログの取得
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const logs = await sql`
      SELECT * FROM project_logs 
      WHERE project_id = ${id}
      ORDER BY log_date DESC, created_at DESC
    `;

    return Response.json(logs);
  } catch (error) {
    console.error("Error fetching project logs:", error);
    return Response.json(
      { error: "ログの取得に失敗しました" },
      { status: 500 },
    );
  }
}

// ログの作成
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, content, log_date, created_by } = body;

    if (!title || !content) {
      return Response.json(
        { error: "タイトルと内容は必須です" },
        { status: 400 },
      );
    }

    const result = await sql`
      INSERT INTO project_logs (project_id, title, content, log_date, created_by)
      VALUES (${id}, ${title}, ${content}, ${log_date || new Date().toISOString().split("T")[0]}, ${created_by})
      RETURNING *
    `;

    // プロジェクトのアクティビティログにも記録
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description, created_by_old)
      VALUES (${id}, 'log_added', ${`ログ「${title}」を追加しました`}, ${created_by})
    `;

    return Response.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating project log:", error);
    return Response.json(
      { error: "ログの作成に失敗しました" },
      { status: 500 },
    );
  }
}



