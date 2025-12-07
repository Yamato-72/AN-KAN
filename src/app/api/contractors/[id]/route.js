import sql from "@/app/api/utils/sql";

// 設置業者詳細取得
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const contractors = await sql("SELECT * FROM contractors WHERE id = $1", [
      id,
    ]);

    if (contractors.length === 0) {
      return Response.json(
        { error: "設置業者が見つかりません" },
        { status: 404 },
      );
    }

    return Response.json(contractors[0]);
  } catch (error) {
    console.error("設置業者詳細取得エラー:", error);
    return Response.json(
      { error: "設置業者の取得に失敗しました" },
      { status: 500 },
    );
  }
}

// 設置業者更新
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      contractor_name,
      company_address,
      phone_number,
      contact_person,
      email,
    } = body;

    if (!contractor_name) {
      return Response.json({ error: "業者名は必須です" }, { status: 400 });
    }

    // 存在チェック
    const existing = await sql("SELECT id FROM contractors WHERE id = $1", [
      id,
    ]);

    if (existing.length === 0) {
      return Response.json(
        { error: "設置業者が見つかりません" },
        { status: 404 },
      );
    }

    // 重複チェック（自分以外で同じ名前）
    const duplicate = await sql(
      "SELECT id FROM contractors WHERE LOWER(contractor_name) = LOWER($1) AND id != $2",
      [contractor_name, id],
    );

    if (duplicate.length > 0) {
      return Response.json(
        { error: "この業者名は既に登録されています" },
        { status: 400 },
      );
    }

    const result = await sql(
      `UPDATE contractors 
       SET contractor_name = $1, company_address = $2, phone_number = $3, 
           contact_person = $4, email = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [
        contractor_name,
        company_address,
        phone_number,
        contact_person,
        email,
        id,
      ],
    );

    return Response.json(result[0]);
  } catch (error) {
    console.error("設置業者更新エラー:", error);
    return Response.json(
      { error: "設置業者の更新に失敗しました" },
      { status: 500 },
    );
  }
}

// 設置業者削除
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // 参照されているプロジェクトがあるかチェック
    const projects = await sql(
      "SELECT id FROM projects WHERE contractor_id = $1 LIMIT 1",
      [id],
    );

    if (projects.length > 0) {
      return Response.json(
        {
          error:
            "この設置業者は既にプロジェクトで使用されているため削除できません",
        },
        { status: 400 },
      );
    }

    const result = await sql(
      "DELETE FROM contractors WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.length === 0) {
      return Response.json(
        { error: "設置業者が見つかりません" },
        { status: 404 },
      );
    }

    return Response.json({ message: "設置業者を削除しました" });
  } catch (error) {
    console.error("設置業者削除エラー:", error);
    return Response.json(
      { error: "設置業者の削除に失敗しました" },
      { status: 500 },
    );
  }
}
