import { query } from "@/lib/db";

// 失注 / 保留 / クリア を切り替えるAPI
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, created_by } = body || {};

    // action: "lost" | "hold" | "clear" を想定
    if (!["lost", "hold", "clear"].includes(action)) {
      return Response.json(
        { error: "action は lost / hold / clear のいずれかを指定してください" },
        { status: 400 }
      );
    }

    // ここが「片方立てたら片方倒す」ロジック本体
    let lostFlag = false;
    let holdFlag = false;

    if (action === "lost") {
      lostFlag = true;
      holdFlag = false;
    } else if (action === "hold") {
      holdFlag = true;
      lostFlag = false;
    } else if (action === "clear") {
      lostFlag = false;
      holdFlag = false;
    }

    // projects テーブル更新
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
      [lostFlag, holdFlag, id]
    );

    if (updateRes.rows.length === 0) {
      return Response.json(
        { error: "対象のプロジェクトが見つかりませんでした" },
        { status: 404 }
      );
    }

    const project = updateRes.rows[0];

    // 任意：project_logs に記録（あとで誰が何をしたか分かるように）
    try {
      let title;
      let content;

      if (action === "lost") {
        title = "失注に変更";
        content = "案件ステータスが『失注』に変更されました。";
      } else if (action === "hold") {
        title = "保留に変更";
        content = "案件ステータスが『保留』に変更されました。";
      } else {
        title = "失注・保留解除";
        content = "失注／保留フラグがクリアされました。";
      }

      await query(
        `
        INSERT INTO project_logs (project_id, title, content, log_date, created_by)
        VALUES ($1, $2, $3, NOW(), $4)
        `,
        [id, title, content, created_by || null]
      );
    } catch (logError) {
      console.error("project_logs への記録に失敗しました:", logError);
      // ここは致命傷ではないので握りつぶす
    }

    return Response.json(project);
  } catch (error) {
    console.error("Error updating deal result:", error);
    return Response.json(
      { error: "失注・保留フラグの更新に失敗しました" },
      { status: 500 }
    );
  }
}
