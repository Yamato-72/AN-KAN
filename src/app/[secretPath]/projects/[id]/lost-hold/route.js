import { query } from "@/lib/db";

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { action } = await request.json();

    if (!["toggleLost", "toggleHold"].includes(action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    // 現在のフラグを取得
    const { rows } = await query(
      `SELECT lost_flag, hold_flag FROM projects WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    let { lost_flag, hold_flag } = rows[0];

    // トグルロジック（片方を立てたらもう片方は倒す）
    if (action === "toggleLost") {
      lost_flag = !lost_flag;
      if (lost_flag) hold_flag = false;
    } else if (action === "toggleHold") {
      hold_flag = !hold_flag;
      if (hold_flag) lost_flag = false;
    }

    const updateRes = await query(
      `
      UPDATE projects
      SET 
        lost_flag = $1,
        hold_flag = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [lost_flag, hold_flag, id]
    );

    return Response.json(updateRes.rows[0]);
  } catch (error) {
    console.error("Error updating lost/hold flags:", error);
    return Response.json(
      { error: "ステータス更新に失敗しました" },
      { status: 500 }
    );
  }
}
