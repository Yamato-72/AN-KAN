import sql from "@/app/api/utils/sql";

// 支払いログの取得
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const payments = await sql`
      SELECT * FROM project_payments 
      WHERE project_id = ${id}
      ORDER BY payment_date DESC, created_at DESC
    `;

    return Response.json(payments);
  } catch (error) {
    console.error("Error fetching project payments:", error);
    return Response.json(
      { error: "支払いログの取得に失敗しました" },
      { status: 500 },
    );
  }
}

// 支払いログの作成
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      title,
      amount,
      payment_date,
      description,
      payment_type,
      created_by,
    } = body;

    if (!title || !amount) {
      return Response.json(
        { error: "タイトルと金額は必須です" },
        { status: 400 },
      );
    }

    const result = await sql`
      INSERT INTO project_payments (project_id, title, amount, payment_date, description, payment_type, created_by)
      VALUES (${id}, ${title}, ${amount}, ${payment_date || new Date().toISOString().split("T")[0]}, ${description}, ${payment_type || "支払い"}, ${created_by})
      RETURNING *
    `;

    // プロジェクトのアクティビティログにも記録
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description, created_by_old)
      VALUES (${id}, 'payment_added', ${`支払い「${title}」(¥${Number(amount).toLocaleString()})を追加しました`}, ${created_by})
    `;

    return Response.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating project payment:", error);
    return Response.json(
      { error: "支払いログの作成に失敗しました" },
      { status: 500 },
    );
  }
}



