import sql from "@/app/api/utils/sql";

// 個別支払いログの取得
export async function GET(request, { params }) {
  try {
    const { id, paymentId } = params;

    const payment = await sql`
      SELECT * FROM project_payments 
      WHERE project_id = ${id} AND id = ${paymentId}
    `;

    if (payment.length === 0) {
      return Response.json(
        { error: "支払いログが見つかりません" },
        { status: 404 },
      );
    }

    return Response.json(payment[0]);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return Response.json(
      { error: "支払いログの取得に失敗しました" },
      { status: 500 },
    );
  }
}

// 支払いログの更新
export async function PUT(request, { params }) {
  try {
    const { id, paymentId } = params;
    const body = await request.json();
    const {
      title,
      amount,
      payment_date,
      description,
      payment_type,
      updated_by,
    } = body;

    if (!title || !amount) {
      return Response.json(
        { error: "タイトルと金額は必須です" },
        { status: 400 },
      );
    }

    const result = await sql`
      UPDATE project_payments 
      SET title = ${title}, 
          amount = ${amount}, 
          payment_date = ${payment_date}, 
          description = ${description}, 
          payment_type = ${payment_type || "支払い"},
          updated_at = now()
      WHERE project_id = ${id} AND id = ${paymentId}
      RETURNING *
    `;

    if (result.length === 0) {
      return Response.json(
        { error: "支払いログが見つかりません" },
        { status: 404 },
      );
    }

    // プロジェクトのアクティビティログにも記録
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description, created_by_old)
      VALUES (${id}, 'payment_updated', ${`支払い「${title}」を更新しました`}, ${updated_by})
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("Error updating payment:", error);
    return Response.json(
      { error: "支払いログの更新に失敗しました" },
      { status: 500 },
    );
  }
}

// 支払いログの削除
export async function DELETE(request, { params }) {
  try {
    const { id, paymentId } = params;
    const url = new URL(request.url);
    const deleted_by = url.searchParams.get("deleted_by");

    // 削除前に支払い情報を取得
    const payment = await sql`
      SELECT * FROM project_payments 
      WHERE project_id = ${id} AND id = ${paymentId}
    `;

    if (payment.length === 0) {
      return Response.json(
        { error: "支払いログが見つかりません" },
        { status: 404 },
      );
    }

    // 支払いログを削除
    await sql`
      DELETE FROM project_payments 
      WHERE project_id = ${id} AND id = ${paymentId}
    `;

    // プロジェクトのアクティビティログにも記録
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description, created_by_old)
      VALUES (${id}, 'payment_deleted', ${`支払い「${payment[0].title}」を削除しました`}, ${deleted_by})
    `;

    return Response.json({ message: "支払いログを削除しました" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return Response.json(
      { error: "支払いログの削除に失敗しました" },
      { status: 500 },
    );
  }
}



