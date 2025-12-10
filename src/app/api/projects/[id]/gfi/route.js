import sql from "@/app/api/utils/sql";

export async function PATCH(request, { params }) {
  try {
    console.log("GFI PATCH request received for project:", params.id);
    const { id } = params;
    const body = await request.json();
    const { gfi } = body;

    console.log("GFI flag value:", gfi);

    if (typeof gfi !== "boolean") {
      return Response.json(
        { error: "gfi field must be a boolean value" },
        { status: 400 },
      );
    }

    // GFIフラグ更新
    console.log("Updating GFI flag in database...");
    const result = await sql`
      UPDATE projects 
      SET gfi = ${gfi}, updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      console.log("Project not found:", id);
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const project = result[0];
    console.log(
      "GFI flag updated successfully for project:",
      project.project_name,
    );

    // アクティビティログ追加
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (
        ${parseInt(id)},
        'gfi_updated',
        ${gfi ? "GFIフラグが設定されました" : "GFIフラグが解除されました"}
      )
    `;
    console.log("Activity log added");

    // ※ ここにあったメール送信処理は削除しました
    //   - sendEmail の import も削除済み
    //   - GFI ON/OFF してもメールは飛ばない仕様

    return Response.json({
      project,
      message: gfi ? "GFIフラグを設定しました" : "GFIフラグを解除しました",
    });
  } catch (error) {
    console.error("❌ Error updating project GFI flag:", error);
    return Response.json(
      { error: "Failed to update GFI flag" },
      { status: 500 },
    );
  }
}
